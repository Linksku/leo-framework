import type { NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import express from 'express';
import compression from 'compression';

import apiRoutes from 'core/apiRoutes';
import sseRoute from 'core/sseRoute';
import { DEFAULT_ASSETS_CACHE_TTL, DOMAIN_NAME } from 'consts/server';
import { isHealthy } from 'services/healthcheck/HealthcheckManager';
import addMetaTags from 'core/addMetaTags';
import {
  INDEX_HEADERS,
  INDEX_ERROR_HEADERS,
  JS_CSS_HEADERS,
  STATIC_HEADERS,
} from 'consts/httpHeaders';

// todo: low/hard maybe switch to Fastify
const app = express();

/*
Don't know if still needed since errors are handled manually
if (process.env.PRODUCTION) {
  Sentry.getCurrentHub().bindClient(
    new Sentry.NodeClient({
      ...TS.defined(Sentry.getCurrentHub().getClient()).getOptions(),
      integrations: [
        new Sentry.Integrations.Http(),
        new Sentry.Integrations.Express({ app }),
      ],
    }),
  );
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.errorHandler());
}
*/

app.use(compression());
app.set('etag', 'weak');
app.disable('x-powered-by');

app.use('/api', apiRoutes);
app.use('/sse', sseRoute);
if (!process.env.PRODUCTION) {
  const { serverAdapter } = await import('services/BullBoard');
  app.use('/admin/queues', serverAdapter.getRouter());
}

function readFile(fileName: string, cb: (file: string) => void) {
  fs.readFile(
    path.resolve(`./build/${process.env.NODE_ENV}/web/${fileName}.html`),
    (err, file) => {
      if (err) {
        ErrorLogger.fatal(err, { ctx: `Read ${fileName}.html` }).catch(() => {
          // eslint-disable-next-line unicorn/no-process-exit
          process.exit(1);
        });
      } else {
        cb(file.toString());
      }
    },
  );
}

function getReqFileName(req: ExpressRequest) {
  if (!req.path || req.path === '/') {
    // Can't split into auth/unauth files because of CDN
    return 'home';
  }
  return 'main';
}

let handleWildcardApi: (req: ExpressRequest, res: ExpressResponse) => Promise<void>;
if (process.env.SERVER !== 'production') {
  app.use(express.static(
    path.resolve(`./build/${process.env.NODE_ENV}/web`),
    { dotfiles: 'allow', redirect: false, index: false },
  ));

  handleWildcardApi = async (req, res) => {
    const html = await fs.promises.readFile(path.resolve(
      `./build/${process.env.NODE_ENV}/web/${getReqFileName(req)}.html`,
    ));
    res.send(await addMetaTags(req, html.toString()));
  };
} else {
  app.all('*', (req, res, next) => {
    if (req.hostname !== DOMAIN_NAME && !req.hostname?.endsWith(`.${DOMAIN_NAME}`)) {
      res.status(403).end();
    } else if (!req.secure) {
      res.redirect(`https://${req.hostname}${req.url}`);
    } else {
      next();
    }
  });

  app.use(express.static(
    path.resolve(`./build/${process.env.NODE_ENV}/web`),
    {
      maxAge: DEFAULT_ASSETS_CACHE_TTL,
      dotfiles: 'allow',
      redirect: false,
      index: false,
      setHeaders(res, reqPath) {
        if (reqPath.endsWith('.js') || reqPath.endsWith('.css')) {
          res.set(JS_CSS_HEADERS);
        } else {
          res.set(STATIC_HEADERS);
        }
      },
    },
  ));

  // todo: mid/hard server routing to add meta tags for shareable links
  const files = new Map<string, string>();
  readFile('main', file => {
    files.set('main', file);
  });
  readFile('home', file => {
    files.set('home', file);
  });
  readFile('503', file => {
    files.set('503', file);
  });

  handleWildcardApi = async (req, res) => {
    if (req.subdomains.length) {
      res
        .status(404)
        .set(INDEX_ERROR_HEADERS)
        .send('<p>Not found</p>');
      return;
    }

    const file = files.get(getReqFileName(req)) ?? files.get('main');
    if (file && isHealthy({ ignoreStaleRR: true })) {
      res
        .set(INDEX_HEADERS)
        .send(await addMetaTags(req, file));
      return;
    }

    res
      .status(503)
      .set(INDEX_ERROR_HEADERS)
      .send(files.get('503') ?? '<p>Service temporarily unavailable</p>');
  };
}

app.get('*', handleWildcardApi);

app.use(async (
  err: Error,
  req: ExpressRequest,
  res: ExpressResponse,
  // Express checks number of args
  _next: NextFunction,
) => {
  if (err instanceof URIError) {
    await handleWildcardApi(req, res);
    return;
  }

  ErrorLogger.error(err, { ctx: 'Express catch-all' });
  res
    .status(400)
    .set(INDEX_ERROR_HEADERS)
    .send('<p>Unknown error occurred</p>');
});

export default app;

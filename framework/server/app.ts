import path from 'path';
import fs from 'fs';
import type { NextFunction, RequestHandler } from 'express';
import express from 'express';
import compression from 'compression';

import { ALLOWED_DOMAIN_NAMES } from 'config';
import apisRoute from 'routes/apis/apisRoute';
import imgProxyRoute from 'routes/imgProxyRoute';
import sseRoute from 'routes/sseRoute';
import {
  DEFAULT_ASSETS_CACHE_TTL,
  DOMAIN_NAME,
  HOME_URL,
  SHORT_DOMAIN_NAME,
} from 'consts/server';
import { isHealthy } from 'services/healthcheck/HealthcheckManager';
import addMetaTags from 'core/addMetaTags';
import {
  INDEX_HEADERS,
  INDEX_ERROR_HEADERS,
  JS_CSS_HEADERS,
  STATIC_HEADERS,
} from 'consts/httpHeaders';
import { getRedirectPath } from 'config/functions';

const htmlFiles = new Map<string, string>();

function readHtmlFile(fileName: string) {
  fs.readFile(
    path.resolve(`./build/${process.env.NODE_ENV}/web/${fileName}.html`),
    (err, file) => {
      if (err) {
        if (fileName === 'main' || fileName === 'home') {
          ErrorLogger.fatal(err, { ctx: `Read ${fileName}.html` }).catch(() => {
            // eslint-disable-next-line unicorn/no-process-exit
            process.exit(1);
          });
        } else {
          ErrorLogger.error(err, { ctx: `Read ${fileName}.html` });
        }
      } else {
        htmlFiles.set(fileName, file.toString());
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

app.use(compression() as RequestHandler);
app.set('etag', 'weak');
app.disable('x-powered-by');

if (process.env.SERVER === 'production') {
  readHtmlFile('main');
  readHtmlFile('home');
  readHtmlFile('503');

  const allowedDomainNamesSet = new Set(ALLOWED_DOMAIN_NAMES);
  app.all('*', async (req, res, next) => {
    const redirectPath = await getRedirectPath(req);
    const redirectUrl = `${HOME_URL}${redirectPath ?? req.path}`;

    if (!allowedDomainNamesSet.has(req.hostname)
      && !ALLOWED_DOMAIN_NAMES.some(domain => req.hostname?.endsWith(`.${domain}`))) {
      res
        .status(403)
        .set(INDEX_ERROR_HEADERS)
        .send('<p>Forbidden</p>');
    } else if (redirectPath
      || !req.secure
      || (SHORT_DOMAIN_NAME !== DOMAIN_NAME && req.hostname === SHORT_DOMAIN_NAME)
      || (req.subdomains.length === 1 && req.subdomains[0] === 'www')) {
      res.redirect(redirectUrl);
    } else {
      next();
    }
  });
} else {
  app.all('*', async (req, res, next) => {
    const redirectPath = await getRedirectPath(req);

    if (redirectPath) {
      res.redirect(`${HOME_URL}${redirectPath ?? req.path}`);
    } else {
      next();
    }
  });
}

app.use('/api', apisRoute);
app.use('/img', imgProxyRoute);
app.use('/sse', sseRoute);

if (!process.env.PRODUCTION) {
  let handler: RequestHandler = () => {
    throw new Error('BullBoard not loaded yet');
  };

  app.use('/admin/queues', (req, res, next) => handler(req, res, next));

  setTimeout(() => {
    import('services/bull/BullBoard')
      .then(({ serverAdapter }) => {
        handler = serverAdapter.getRouter();
      })
      .catch(err => ErrorLogger.error(err, { ctx: 'BullBoard' }));
  }, 0);
}

let handleWildcardApi: (req: ExpressRequest, res: ExpressResponse) => Promise<void>;
if (process.env.SERVER === 'production') {
  app.use(express.static(
    path.resolve(`./build/${process.env.NODE_ENV}/web`),
    {
      maxAge: DEFAULT_ASSETS_CACHE_TTL,
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

  handleWildcardApi = async (req, res) => {
    if (req.subdomains.length) {
      res
        .status(404)
        .set(INDEX_ERROR_HEADERS)
        .send('<p>Not found</p>');
      return;
    }

    const file = htmlFiles.get(getReqFileName(req)) ?? htmlFiles.get('main');
    if (file && isHealthy({ ignoreStaleRR: true })) {
      res
        .set(INDEX_HEADERS)
        .send(await addMetaTags(req, file));
      return;
    }

    res
      .status(503)
      .set(INDEX_ERROR_HEADERS)
      .send(htmlFiles.get('503') ?? '<p>Service temporarily unavailable</p>');
  };
} else {
  app.use(express.static(
    path.resolve(`./build/${process.env.NODE_ENV}/web`),
    {
      maxAge: 0,
      redirect: false,
      index: false,
    },
  ));

  handleWildcardApi = async (req, res) => {
    const html = await fs.promises.readFile(path.resolve(
      `./build/${process.env.NODE_ENV}/web/${getReqFileName(req)}.html`,
    ));
    res.send(await addMetaTags(req, html.toString()));
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

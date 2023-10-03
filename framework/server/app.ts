import type { NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import express from 'express';
import compression from 'compression';
import * as Sentry from '@sentry/node';

import apiRoutes from 'routes/apiRoutes';
import sseRoute from 'routes/sseRoute';
import { DEFAULT_ASSETS_CACHE_TTL, DOMAIN_NAME } from 'settings';
import { isHealthy } from 'services/healthcheck/HealthcheckManager';
import addMetaTags from 'helpers/addMetaTags';

// todo: low/hard maybe switch to Fastify
const app = express();

if (process.env.PRODUCTION) {
  Sentry.getCurrentHub().bindClient(
    new Sentry.NodeClient({
      ...TS.defined(Sentry.getCurrentHub().getClient()).getOptions(),
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.Express({ app }),
      ],
    }),
  );
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
  app.use(Sentry.Handlers.errorHandler());
}

app.use(compression());
app.set('etag', 'weak');
app.disable('x-powered-by');

app.use('/api', apiRoutes);
app.use('/sse', sseRoute);

let handleWildcardApi: (req: ExpressRequest, res: ExpressResponse) => Promise<void>;
if (process.env.SERVER !== 'production') {
  app.use(express.static(
    path.resolve(`./build/${process.env.NODE_ENV}/web`),
    { dotfiles: 'allow', redirect: false, index: false },
  ));

  handleWildcardApi = async (req, res) => {
    if (isHealthy(!process.env.PRODUCTION)) {
      const html = await fs.promises.readFile(path.resolve(
        `./build/${process.env.NODE_ENV}/web/index.html`,
      ));
      res.send(await addMetaTags(req, html.toString()));
    } else {
      // todo: mid/mid show failing reason
      res
        .status(503)
        .sendFile(path.resolve(`./build/${process.env.NODE_ENV}/web/503.html`));
    }
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
      setHeaders(res, file) {
        if (/\.html$/i.test(file)) {
          res
            .setHeader(
              'Cache-Control',
              process.env.PRODUCTION ? 'public,max-age=60' : 'public,max-age=0',
            );
        }
      },
    },
  ));

  // todo: mid/hard server routing to add meta tags for shareable links
  let indexFile: string;
  let serviceUnavailableFile: string;
  fs.readFile(
    path.resolve(`./build/${process.env.NODE_ENV}/web/index.html`),
    (err, file) => {
      if (err) {
        ErrorLogger.fatal(err, { ctx: 'Read index.html' }).catch(() => {
          // eslint-disable-next-line unicorn/no-process-exit
          process.exit(1);
        });
      } else {
        indexFile = file.toString();
      }
    },
  );
  fs.readFile(path.resolve(`./build/${process.env.NODE_ENV}/web/503.html`), (err, file) => {
    if (err) {
      ErrorLogger.fatal(err, { ctx: 'Read 503.html' }).catch(() => {
        // eslint-disable-next-line unicorn/no-process-exit
        process.exit(1);
      });
    } else {
      serviceUnavailableFile = file.toString();
    }
  });

  handleWildcardApi = async (req, res) => {
    if (req.subdomains.length) {
      res.status(404).end();
      return;
    }
    if (indexFile && isHealthy()) {
      res
        .setHeader(
          'Cache-Control',
          process.env.PRODUCTION ? 'public,max-age=60' : 'public,max-age=0',
        )
        .send(await addMetaTags(req, indexFile));
    } else {
      res
        .status(503)
        .setHeader('Cache-Control', 'public,max-age=0')
        .send(serviceUnavailableFile ?? '<p>Service temporarily unavailable</p>');
    }
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
    .setHeader('Cache-Control', 'public,max-age=0')
    .send('<p>Unknown error occurred</p>');
});

export default app;

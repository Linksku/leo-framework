import path from 'path';
import fs from 'fs';
import express from 'express';
import compression from 'compression';
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';

import apiRoutes from 'routes/apiRoutes';
import sseRoute from 'routes/sseRoute';
import { DOMAIN_NAME } from 'settings';

// todo: low/hard switch to Fastify
const app = express();

if (process.env.PRODUCTION) {
  Sentry.getCurrentHub().bindClient(
    new Sentry.NodeClient({
      ...TS.defined(Sentry.getCurrentHub().getClient()).getOptions(),
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Tracing.Integrations.Express({ app }),
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

if (process.env.SERVER !== 'production') {
  app.use(express.static(
    path.resolve('./build/development/web'),
    { dotfiles: 'allow', redirect: false, index: false },
  ));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve('./build/development/web/index.html'));
  });
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
    path.resolve('./build/production/web'),
    {
      maxAge: 24 * 60 * 60 * 1000,
      dotfiles: 'allow',
      redirect: false,
      index: false,
      setHeaders(res, file) {
        if (/\.html$/i.test(file)) {
          res.setHeader(
            'Cache-Control',
            process.env.PRODUCTION ? 'public,max-age=60' : 'public,max-age=0',
          );
        }
      },
    },
  ));

  const indexFile = fs.readFileSync(path.resolve('./build/production/web/index.html')).toString()
    || '<p>Temporarily unavailable.</p>';
  app.get('*', (req, res) => {
    if (req.subdomains.length) {
      res.status(404).end();
      return;
    }

    res.set(
      'Cache-Control',
      process.env.PRODUCTION ? 'public,max-age=60' : 'public,max-age=0',
    );
    res.send(indexFile);
    res.end();
  });
}

export default app;

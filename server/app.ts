import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import compression from 'compression';
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';

import apiRoutes from 'routes/apiRoutes';
import sseRoute from 'routes/sseRoute';
import { DOMAIN_NAME, HOME_URL, PROTOCOL } from 'settings';
import CronManager from 'services/CronManager';

import 'services/knex';

const app = express();

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN_SERVER,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Tracing.Integrations.Express({ app }),
    ],
    tracesSampleRate: 1, // process.env.NODE_ENV === 'production' ? 0.01 : 1,
  });
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
  app.use(Sentry.Handlers.errorHandler());
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
  origin: [
    HOME_URL,
    new RegExp(`${PROTOCOL}([^/]+\\.)?${DOMAIN_NAME}$`, 'i'),
  ],
  optionsSuccessStatus: 200,
  credentials: true,
  allowedHeaders: [
    'authorization',
    'content-type',
  ],
}));
app.use(compression());
app.set('etag', 'weak');
app.disable('x-powered-by');

app.use('/api', apiRoutes);
app.use('/sse', sseRoute);

if (process.env.SERVER !== 'production') {
  app.use(express.static(
    path.resolve('./build/web'),
    { dotfiles: 'allow', redirect: false, index: false },
  ));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve('./build/web/index.html'));
  });
} else {
  app.all('*', (req, res, next) => {
    if (req.hostname !== DOMAIN_NAME && !req.hostname.endsWith(`.${DOMAIN_NAME}`)) {
      res.status(403);
    } else if (!req.secure) {
      res.redirect(`https://${req.hostname}${req.url}`);
    } else {
      next();
    }
  });

  app.use(express.static(
    path.resolve('../web'),
    {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      dotfiles: 'allow',
      redirect: false,
      index: false,
      setHeaders(res, file) {
        if (/\.(html|js|css|json|txt)/i.test(file)) {
          res.setHeader('Cache-Control', 'public,max-age=60');
        }
      },
    },
  ));

  const indexFile = fs.readFileSync(path.resolve('../web/index.html')).toString();
  app.get('*', async (req, res) => {
    if (req.subdomains.length) {
      res.status(404);
      return;
    }

    res.set('Cache-Control', 'public,max-age=0');
    res.send(indexFile);
    res.end();
  });
}

void CronManager.start();

export default app;

import {
  init,
  BrowserTracing,
  configureScope,
  withScope,
  captureException,
} from '@sentry/browser';

init({
  dsn: process.env.SENTRY_DSN_WEB,
  integrations: [new BrowserTracing()],
  tracesSampleRate: 1, // process.env.PRODUCTION ? 0.01 : 1,
});

export default {
  configureScope,
  withScope,
  captureException,
};

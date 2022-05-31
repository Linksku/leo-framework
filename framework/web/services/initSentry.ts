import { init, configureScope, withScope, captureException } from '@sentry/browser';
import { Integrations } from '@sentry/tracing';

init({
  dsn: process.env.SENTRY_DSN_WEB,
  integrations: [new Integrations.BrowserTracing()],
  tracesSampleRate: 1, // process.env.PRODUCTION ? 0.01 : 1,
});

export default {
  configureScope,
  withScope,
  captureException,
};

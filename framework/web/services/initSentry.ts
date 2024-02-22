import {
  init,
  BrowserTracing,
  configureScope,
  withScope,
  captureException,
} from '@sentry/browser';
import { SENTRY_DSN_WEB } from 'config';

init({
  dsn: SENTRY_DSN_WEB,
  integrations: [new BrowserTracing()],
  tracesSampleRate: 1, // process.env.PRODUCTION ? 0.01 : 1,
});

export default {
  configureScope,
  withScope,
  captureException,
};

import * as Sentry from '@sentry/node';

if (!process.env.PRODUCTION) {
  Error.stackTraceLimit = 30;
}

Sentry.init({
  dsn: process.env.SENTRY_DSN_SERVER,
  tracesSampleRate: process.env.PRODUCTION ? 0.01 : 1,
});

export {};

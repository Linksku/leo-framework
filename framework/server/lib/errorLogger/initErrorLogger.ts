import * as Sentry from '@sentry/node';

if (process.env.NODE_ENV !== 'production') {
  Error.stackTraceLimit = 30;
}

Sentry.init({
  dsn: process.env.SENTRY_DSN_SERVER,
  tracesSampleRate: 1, // process.env.NODE_ENV === 'production' ? 0.01 : 1,
});

export {};

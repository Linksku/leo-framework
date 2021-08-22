import type SentryType from '@sentry/browser';
import type { Severity } from '@sentry/types';

import detectOs from 'lib/detectOs';
import isOsMobile from 'lib/isOsMobile';

type SupportedSeverity = 'debug' | 'warning' | 'error' | 'fatal';

let Sentry: {
  init: typeof SentryType.init,
  configureScope: typeof SentryType.configureScope,
  withScope: typeof SentryType.withScope,
  captureException: typeof SentryType.captureException,
} | null = null;
let queuedErrors: { level: SupportedSeverity, err: Error, ctx: string }[] = [];
let latestUserId: number | null = null;

const _queueError = (level: SupportedSeverity, err: Error, ctx: string) => {
  if (process.env.NODE_ENV !== 'production' || process.env.SERVER !== 'production') {
    return;
  }
  if (Sentry) {
    Sentry.withScope(scope => {
      scope.setLevel(level as Severity);
      scope.setExtra('ctx', ctx);
      Sentry?.captureException(err);
    });
  } else {
    queuedErrors.push({ level, err, ctx });
  }
};

export const setErrorLoggerUserId = (userId: Nullish<number>) => {
  latestUserId = userId ?? null;

  if (Sentry) {
    Sentry.configureScope(scope => {
      scope.setUser({ id: userId?.toString() });
    });
  }
};

const ErrorLogger = {
  debug(err: Error, ctx = '') {
    // eslint-disable-next-line no-console
    console.log(`${ctx} ${err.stack || err}`);
    _queueError('debug', err, ctx);
  },

  warning(err: Error, ctx = '') {
    console.warn(`${ctx} ${err.stack || err}`);
    _queueError('warning', err, ctx);
  },

  error(err: Error, ctx = '') {
    console.error(`${ctx} ${err.stack || err}`);
    _queueError('error', err, ctx);
  },

  fatal(err: Error, ctx = '') {
    console.error(`${ctx} ${err.stack || err}`);
    _queueError('fatal', err, ctx);
  },
} as const;

export const loadErrorLogger = (userId?: number) => {
  if (process.env.NODE_ENV !== 'production' || process.env.SERVER !== 'production') {
    return;
  }
  latestUserId = userId ?? null;

  Promise.all([
    import('@sentry/browser'),
    import('@sentry/tracing'),
  ])
    .then(([_sentry, tracing]) => {
      Sentry = _sentry;
      Sentry.init({
        dsn: process.env.SENTRY_DSN_WEB,
        integrations: [new tracing.Integrations.BrowserTracing()],
        tracesSampleRate: 1, // process.env.NODE_ENV === 'production' ? 0.01 : 1,
      });
      Sentry.configureScope(scope => {
        const os = detectOs(window.navigator.userAgent);
        scope.setUser({ id: latestUserId?.toString() });
        scope.setTag('userId', latestUserId);
        scope.setTag('jsVersion', process.env.JS_VERSION);
        scope.setTag('isMobile', isOsMobile(window.navigator.userAgent));
        scope.setTag('language', window.navigator.language);
        scope.setTag('os', os);
        scope.setTag('userAgent', window.navigator.userAgent);
      });

      if (queuedErrors.length) {
        for (const { level, err, ctx } of queuedErrors) {
          ErrorLogger[level](err, ctx);
        }
        queuedErrors = [];
      }
    })
    .catch(err => {
      console.error(err);
    });
};

export default ErrorLogger;

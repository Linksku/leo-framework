import type SentryType from '@sentry/browser';
import type { Severity } from '@sentry/types';
import qs from 'query-string';

import detectOs from 'lib/detectOs';
import isOsMobile from 'lib/isOsMobile';

type SupportedSeverity = Severity.Warning | Severity.Error | Severity.Fatal;

let Sentry: {
  configureScope: typeof SentryType.configureScope,
  withScope: typeof SentryType.withScope,
  captureException: typeof SentryType.captureException,
} | null = null;
let queuedErrors: { level: SupportedSeverity, err: Error, ctx: string }[] = [];
let latestUserId : EntityId | null = null;

const _queueError = (level: SupportedSeverity, err: Error, ctx: string) => {
  if (process.env.NODE_ENV !== 'production' || process.env.SERVER !== 'production') {
    return;
  }
  if (Sentry) {
    Sentry.withScope(scope => {
      scope.setLevel(level as Severity);
      scope.setExtra('ctx', ctx);
      scope.setTag('jsVersion', process.env.JS_VERSION);

      Sentry?.captureException(err);
    });
  } else {
    queuedErrors.push({ level, err, ctx });
  }
};

export const setErrorLoggerUserId = (userId: Nullish<User['id']>) => {
  latestUserId = userId ?? null;

  if (Sentry) {
    Sentry.configureScope(scope => {
      scope.setUser({ id: userId?.toString() });
    });
  }
};

const ErrorLogger = {
  warn(err: Error, ctx = '') {
    // eslint-disable-next-line no-console
    console.warn(`${ctx} ${err.stack || err}`);
    _queueError('warning' as Severity.Warning, err, ctx);
  },

  error(err: Error, ctx = '') {
    // eslint-disable-next-line no-console
    console.error(`${ctx} ${err.stack || err}`);
    _queueError('error' as Severity.Error, err, ctx);
  },

  fatal(err: Error, ctx = '') {
    // eslint-disable-next-line no-console
    console.error(`${ctx} ${err.stack || err}`);
    _queueError('fatal' as Severity.Fatal, err, ctx);
  },
} as const;

export const loadErrorLogger = (userId : EntityId | null) => {
  if (process.env.NODE_ENV !== 'production' || process.env.SERVER !== 'production') {
    return;
  }
  latestUserId = userId;

  import(/* webpackChunkName: 'initSentry' */ 'lib/initSentry')
    .then(module => {
      Sentry = module.default;
      Sentry.configureScope(scope => {
        const os = detectOs(window.navigator.userAgent);
        let params: ObjectOf<any> | undefined;
        try {
          params = qs.parse(window.location.search.slice(1));
        } catch {}

        scope.setUser({ id: latestUserId?.toString() });
        scope.setTag('userId', latestUserId);
        scope.setTag('jsVersion', process.env.JS_VERSION);
        scope.setTag('callsite', 'web');

        scope.setTag('userAgent', window.navigator.userAgent);
        scope.setTag('os', os);
        scope.setTag('isMobile', isOsMobile(os));
        scope.setTag('language', window.navigator.language);
        scope.setTag('path', window.location.pathname);
        scope.setTag('hash', window.location.hash.slice(1));

        if (params) {
          for (const [k, v] of TS.objEntries(params)) {
            scope.setTag(`param:${k}`, v);
          }
        }
      });

      if (queuedErrors.length) {
        for (const { level, err, ctx } of queuedErrors) {
          _queueError(level, err, ctx);
        }
        queuedErrors = [];
      }
    })
    .catch(err => {
      // eslint-disable-next-line no-console
      console.error(err);
    });
};

export default ErrorLogger;
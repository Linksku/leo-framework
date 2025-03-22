import type SentryType from '@sentry/browser';
import type { SeverityLevel } from '@sentry/types';
import { App } from '@capacitor/app';

import { SENTRY_DSN_WEB } from 'config/config';
import detectPlatform from 'utils/detectPlatform';
import formatErr from 'utils/formatErr';
import getUrlParams from 'utils/getUrlParams';
import retryImport from 'utils/retryImport';

const WARN_THROTTLE_DURATION = 10 * 60 * 1000;
const ERROR_THROTTLE_DURATION = 60 * 1000;
const lastLoggedTimes = new Map<string, number>();

let Sentry: typeof SentryType | null = null;
let queuedErrors: { level: SeverityLevel, err: Error }[] = [];

const _queueError = (level: SeverityLevel, err: Error) => {
  if (!process.env.PRODUCTION || process.env.SERVER !== 'production') {
    return;
  }

  const msg = err.message && err.debugCtx?.ctx && !err.message.includes(': ')
    ? `${err.debugCtx?.ctx}: ${err.message}`
    : err.message;
  const lastLoggedTime = msg && lastLoggedTimes.get(msg);
  const throttleDuration = level === 'warning' ? WARN_THROTTLE_DURATION : ERROR_THROTTLE_DURATION;
  if (lastLoggedTime && performance.now() - lastLoggedTime < throttleDuration) {
    return;
  }
  lastLoggedTimes.set(msg, performance.now());

  if (Sentry) {
    const serializedCtx: ObjectOf<any> = Object.create(null);
    if (err.debugCtx) {
      for (const [k, v] of Object.entries(err.debugCtx)) {
        serializedCtx[k] = `${typeof v === 'object' ? JSON.stringify(v) : v}`.slice(0, 1000);
      }
    }

    const newErr = new Error(msg);
    newErr.stack = err.stack;
    Sentry.captureException(newErr, {
      level,
      contexts: {
        debugCtx: serializedCtx,
      },
    });
  } else {
    queuedErrors.push({ level, err });
  }
};

function _isErrorDoubleInvoked(err: unknown) {
  if (process.env.PRODUCTION
    || !TS.isObj(err)
    || typeof err.stack !== 'string') {
    return false;
  }

  return err.stack?.includes('DoubleInvokeEffects');
}

const ErrorLogger = {
  warn<T>(
    _err: T & (
      T extends Error ? unknown
      : unknown extends T ? unknown
      : never
    ),
    debugCtx?: ObjectOf<any>,
    consoleLog = true,
    sendToSentry = true,
  ) {
    let err: Error;
    if (_err instanceof Error) {
      err = debugCtx ? getErr(_err as Error, debugCtx) : _err;
    } else {
      err = getErr('ErrorLogger.warn: got non-Error', {
        ...debugCtx,
        nonError: _err,
      });
    }

    if (consoleLog && !_isErrorDoubleInvoked(err)) {
      // eslint-disable-next-line no-console
      console.warn(formatErr(err));
    }
    if (sendToSentry) {
      _queueError('warning', err);
    }
  },

  error<T>(
    _err: T & (
      T extends Error ? unknown
      : unknown extends T ? unknown
      : never
    ),
    debugCtx?: ObjectOf<any>,
    consoleLog = true,
    sendToSentry = true,
  ) {
    let err: Error;
    if (_err instanceof Error) {
      err = debugCtx ? getErr(_err as Error, debugCtx) : _err;
    } else {
      err = getErr('ErrorLogger.error: got non-Error', {
        ...debugCtx,
        nonError: _err,
      });
    }

    if (consoleLog && !_isErrorDoubleInvoked(err)) {
      // eslint-disable-next-line no-console
      console.error(formatErr(err));
    }
    if (sendToSentry) {
      _queueError('error', err);
    }
  },

  fatal<T>(
    _err: T & (
      T extends Error ? unknown
      : unknown extends T ? unknown
      : never
    ),
    debugCtx?: ObjectOf<any>,
    consoleLog = true,
    sendToSentry = true,
  ) {
    let err: Error;
    if (_err instanceof Error) {
      err = debugCtx ? getErr(_err as Error, debugCtx) : _err;
    } else {
      err = getErr('ErrorLogger.fatal: got non-Error', {
        ...debugCtx,
        nonError: _err,
      });
    }

    if (consoleLog && !_isErrorDoubleInvoked(err)) {
      // eslint-disable-next-line no-console
      console.error(formatErr(err));
    }
    if (sendToSentry) {
      _queueError('fatal', err);
    }
  },
} as const;

let latestUserId : IUser['id'] | null = null;

export function setErrorLoggerUserId(userId: Nullish<IUser['id']>): void {
  latestUserId = userId ?? null;

  if (Sentry) {
    Sentry.getCurrentScope().setUser({ id: userId?.toString() });
  }
}

export function loadErrorLogger(userId : IUser['id'] | null): void {
  if (!process.env.PRODUCTION || process.env.SERVER !== 'production') {
    return;
  }

  latestUserId = userId;

  Promise.all([
    retryImport(() => import(/* webpackChunkName: 'Sentry' */ '@sentry/browser')),
    detectPlatform().isNative ? App.getInfo() : null,
  ])
    .then(([module, appInfo]) => {
      Sentry = module;

      Sentry.init({
        dsn: SENTRY_DSN_WEB,
        release: process.env.JS_VERSION,
      });

      const scope = Sentry.getCurrentScope();
      const platform = detectPlatform();
      const params = getUrlParams();

      scope.setUser({ id: latestUserId?.toString() });
      scope.setTag('userId', latestUserId);
      if (appInfo) {
        scope.setTag('appVersion', appInfo.version);
      }
      scope.setTag('jsVersion', process.env.JS_VERSION);
      scope.setTag('callsite', 'client');

      scope.setTag('userAgent', window.navigator.userAgent);
      scope.setTag('os', platform.os);
      scope.setTag('platform', platform.type);
      if (platform.webviewApp) {
        scope.setTag('3rdPartyWebview', platform.webviewApp);
      }
      scope.setTag('language', window.navigator.language);
      scope.setTag('path', window.location.pathname);
      if (window.location.hash) {
        scope.setTag('hash', window.location.hash.slice(1));
      }

      if (params) {
        for (const [k, v] of params.entries()) {
          scope.setTag(
            `param:${k}`,
            typeof v === 'string' ? v : JSON.stringify(v),
          );
        }
      }

      if (queuedErrors.length) {
        for (const { level, err } of queuedErrors) {
          _queueError(level, err);
        }
        queuedErrors = [];
      }
    })
    .catch(err => {
      // eslint-disable-next-line no-console
      console.error(err);
    });
}

export default ErrorLogger;

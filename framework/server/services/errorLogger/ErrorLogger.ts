import type { SeverityLevel } from '@sentry/types';
import * as Sentry from '@sentry/node';
import mapValues from 'lodash/mapValues.js';

import formatErr from 'utils/formatErr';

if (!process.env.PRODUCTION) {
  Error.stackTraceLimit = 30;
}

if (process.env.PRODUCTION) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN_SERVER,
    tracesSampleRate: process.env.PRODUCTION ? 0.01 : 1,
  });
}

const WARN_THROTTLE_DURATION = 10 * 60 * 1000;
const ERROR_THROTTLE_DURATION = 60 * 1000;
const lastLoggedTimes = new Map<string, number>();

// todo: low/mid maybe switch to Pino
function _log(level: SeverityLevel, err: Error) {
  if (!process.env.PRODUCTION) {
    return;
  }

  if (err.message && err.debugCtx?.ctx && !err.message.includes(': ')) {
    err.message = `${err.debugCtx?.ctx}: ${err.message}`;
  }
  const lastLoggedTime = err.message && lastLoggedTimes.get(err.message);
  const throttleDuration = level === 'warning' ? WARN_THROTTLE_DURATION : ERROR_THROTTLE_DURATION;
  // Note: this depuding is per server
  if (lastLoggedTime && performance.now() - lastLoggedTime < throttleDuration) {
    return;
  }
  lastLoggedTimes.set(err.message, performance.now());

  try {
    Sentry.withScope(scope => {
      // eslint-disable-next-line unicorn/prefer-module
      require('./setErrorLoggerScope').default(scope);

      Sentry.captureException(err, {
        level,
        contexts: {
          debugCtx: mapValues(
            err.debugCtx,
            val => formatErr(val).slice(0, 1000),
          ),
        },
      });
    });
  } catch (err2) {
    printDebug(err2, 'error', { prod: 'always' });
  }
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

    if (consoleLog) {
      printDebug(err, 'warn');
    }
    _log('warning', err);
  },

  error<T>(
    _err: T & (
      T extends Error ? unknown
      : unknown extends T ? unknown
      : never
    ),
    debugCtx?: ObjectOf<any>,
    consoleLog = true,
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

    if (consoleLog) {
      printDebug(err, 'error', { prod: 'always' });
    }
    _log('error', err);
  },

  async fatal<T>(
    _err: T & (
      T extends Error ? unknown
      : unknown extends T ? unknown
      : never
    ),
    debugCtx?: ObjectOf<any>,
  ) {
    try {
      let err: Error;
      if (_err instanceof Error) {
        err = debugCtx ? getErr(_err as Error, debugCtx) : _err;
      } else {
        err = getErr('ErrorLogger.fatal: got non-Error', {
          ...debugCtx,
          nonError: _err,
        });
      }

      printDebug(err, 'error', { prod: 'always' });
      _log('fatal', err);
    } catch (err2) {
      printDebug(err2, 'error', { prod: 'always' });
    }

    try {
      await ErrorLogger.flushAndExit(1);
    } catch (err2) {
      printDebug(err2, 'error', { prod: 'always' });
      // eslint-disable-next-line unicorn/no-process-exit
      process.exit(1);
    }
  },

  async flushAndExit(code?: number) {
    try {
      await Sentry.close(2000);
    } catch (err) {
      printDebug(err, 'error', { prod: 'always' });
    }
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(code);
  },
} as const;

export default ErrorLogger;

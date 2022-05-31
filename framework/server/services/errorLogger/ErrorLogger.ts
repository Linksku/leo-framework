import { SeverityLevel } from '@sentry/types';
import * as Sentry from '@sentry/node';

const _log = (level: SeverityLevel, err: unknown, ctx: string) => {
  try {
    Sentry.withScope(scope => {
      scope.setLevel(level);
      scope.setExtra('ctx', ctx);

      // eslint-disable-next-line global-require
      require('./setErrorLoggerScope').default(scope);

      if (err instanceof Error) {
        Sentry.captureException(err);
      } else {
        scope.setExtra('err', err);
        Sentry.captureException(new Error('Non-error was thrown.'));
      }
    });
  } catch (err2) {
    // eslint-disable-next-line no-console
    console.error(err2);
  }
};

export default {
  warn(err: unknown, ctx = '') {
    if (!process.env.PRODUCTION) {
      printDebug(`${ctx} ${err instanceof Error ? err.stack || err : err}`, 'warn');
    }
    _log('warning', err, ctx);
  },

  error(err: unknown, ctx = '') {
    printDebug(`${ctx} ${err instanceof Error ? err.stack || err : err}`, 'error');
    _log('error', err, ctx);
  },

  fatal(err: unknown, ctx = '') {
    // eslint-disable-next-line no-console
    printDebug(`${ctx} ${err instanceof Error ? err.stack || err : err}`, 'error');
    _log('fatal', err, ctx);
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(1);
  },
} as const;

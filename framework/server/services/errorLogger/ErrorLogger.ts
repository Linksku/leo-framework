import type { SeverityLevel } from '@sentry/types';
import * as Sentry from '@sentry/node';
import chalk from 'chalk';

const THROTTLE_DURATION = 1000;
const lastLoggedTimes: ObjectOf<number> = Object.create(null);

// todo: low/mid look into Pino
const _log = (level: SeverityLevel, err: unknown, debugCtx: string) => {
  const msg = err instanceof Error
    ? err.message
    : (typeof err === 'string' ? err : null);
  const lastLoggedTime = msg && lastLoggedTimes[msg];
  if (msg && lastLoggedTime && performance.now() - lastLoggedTime < THROTTLE_DURATION) {
    return;
  }

  try {
    Sentry.withScope(scope => {
      scope.setLevel(level);
      scope.setExtra('ctx', debugCtx);

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
  warn(err: Error, debugCtx = '') {
    if (!process.env.PRODUCTION) {
      printDebug(`${debugCtx} ${err instanceof Error ? err.stack || err : err}`, 'warn');
    }
    _log('warning', err, debugCtx);
  },

  error(err: Error, debugCtx = '') {
    printDebug(`${debugCtx} ${err instanceof Error ? err.stack || err : err}`, 'error');
    _log('error', err, debugCtx);
  },

  fatal(err: Error, debugCtx = '') {
    // eslint-disable-next-line no-console
    console.log(chalk.red(`${debugCtx} ${err instanceof Error ? err.stack || err : err}`));
    _log('fatal', err, debugCtx);
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(1);
  },

  castError(err: unknown) {
    if (err instanceof Error) {
      return err;
    }
    return new Error(`Caught non-error: ${err}`);
  },
} as const;

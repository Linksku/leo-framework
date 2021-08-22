import type { Severity } from '@sentry/types';
import Sentry from '@sentry/node';

import getServerId from 'lib/getServerId';

type SupportedSeverity = 'debug' | 'warning' | 'error' | 'fatal';

const _log = (level: SupportedSeverity, err: Error, ctx: string) => {
  if (process.env.NODE_ENV !== 'production' || process.env.SERVER !== 'production') {
    return;
  }

  Sentry.withScope(scope => {
    scope.setLevel(level as Severity);
    scope.setExtra('ctx', ctx);

    scope.setTag('jsVersion', process.env.JS_VERSION);
    scope.setTag('serverId', getServerId());

    Sentry.captureException(err);
  });
};

export default {
  debug(err: Error, ctx = '') {
    // eslint-disable-next-line no-console
    console.log(`${ctx} ${err.stack || err}`);
    _log('debug', err, ctx);
  },

  warning(err: Error, ctx = '') {
    console.warn(`${ctx} ${err.stack || err}`);
    _log('warning', err, ctx);
  },

  error(err: Error, ctx = '') {
    console.error(`${ctx} ${err.stack || err}`);
    _log('error', err, ctx);
  },

  fatal(err: Error, ctx = '') {
    console.error(`${ctx} ${err.stack || err}`);
    _log('fatal', err, ctx);
  },
} as const;

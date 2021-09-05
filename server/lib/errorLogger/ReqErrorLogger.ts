import type { Severity } from '@sentry/types';
import * as Sentry from '@sentry/node';

import detectOs from 'lib/detectOs';
import isOsMobile from 'lib/isOsMobile';

type SupportedSeverity = 'debug' | 'warning' | 'error' | 'fatal';

const _log = (level: SupportedSeverity, req: ExpressRequest, err: Error, ctx: string) => {
  const paramsStr: string = req.method === 'GET'
    ? req.query.params
    : req.body.params;
  let params: ObjectOf<any> = {};
  try {
    params = JSON.parse(paramsStr);
  } catch {}

  Sentry.withScope(scope => {
    scope.setLevel(level as Severity);
    scope.setExtra('ctx', ctx);

    const userAgent = req.headers['user-agent'];
    scope.setUser({ id: req.currentUserId?.toString() });
    scope.setTag('userId', req.currentUserId);
    scope.setTag('jsVersion', process.env.JS_VERSION);
    scope.setTag('isMobile', userAgent ? isOsMobile(userAgent) : null);
    scope.setTag('language', req.acceptsLanguages()[0]);
    scope.setTag('os', userAgent ? detectOs(userAgent) : null);
    scope.setTag('userAgent', userAgent);
    scope.setTag('path', req.path);

    for (const [k, v] of TS.objectEntries(params)) {
      scope.setTag(`param:${k}`, v);
    }

    Sentry.captureException(err);
  });
};

export default {
  debug(req: ExpressRequest, err: Error, ctx = '') {
    // eslint-disable-next-line no-console
    console.log(`${ctx} ${err.stack || err}`);
    _log('debug', req, err, ctx);
  },

  warning(req: ExpressRequest, err: Error, ctx = '') {
    console.warn(`${ctx} ${err.stack || err}`);
    _log('warning', req, err, ctx);
  },

  error(req: ExpressRequest, err: Error, ctx = '') {
    console.error(`${ctx} ${err.stack || err}`);
    _log('error', req, err, ctx);
  },

  fatal(req: ExpressRequest, err: Error, ctx = '') {
    console.error(`${ctx} ${err.stack || err}`);
    _log('fatal', req, err, ctx);
  },
} as const;

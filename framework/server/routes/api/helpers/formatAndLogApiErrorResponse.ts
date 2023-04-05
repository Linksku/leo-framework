import { ValidationError } from 'objection';
import { UniqueViolationError } from 'db-errors';

import ucFirst from 'utils/ucFirst';
import { PG_BT_PORT, MZ_PORT, PG_RR_PORT } from 'consts/infra';

function _shouldLogErr(err: Error): boolean {
  if (err instanceof UserFacingError && err.status === 469) {
    return false;
  }
  return true;
}

function _getErrDetails(err: Error): { status: number; msg: string; } {
  const msg = err.message || err.toString();

  if (err instanceof ValidationError) {
    return {
      status: 400,
      msg,
    };
  }
  if (err instanceof UniqueViolationError) {
    if (err.columns.length) {
      return {
        status: 400,
        msg: `${ucFirst(err.table)} ${err.columns[0]} already exists.`,
      };
    }
    return {
      status: 400,
      msg: `${ucFirst(err.table)} already exists.`,
    };
  }
  if (err instanceof UserFacingError) {
    return {
      status: err.status,
      msg,
    };
  }
  if (TS.hasDefinedProp(err, 'fatal')) {
    return {
      status: 503,
      msg: 'Database unavailable.',
    };
  }
  if (TS.hasDefinedProp(err, 'code')
    && err.code === 'ECONNREFUSED'
    && TS.hasDefinedProp(err, 'port')) {
    if (err.port === PG_BT_PORT) {
      return {
        status: 503,
        msg: 'Database unavailable.',
      };
    }
    if (err.port === MZ_PORT || err.port === PG_RR_PORT) {
      return {
        status: 503,
        msg: 'Database replica unavailable.',
      };
    }
  }
  return {
    status: 500,
    msg: process.env.PRODUCTION
      ? 'Unknown error occurred.'
      : msg,
  };
}

export default function formatAndLogApiErrorResponse(
  _err: unknown,
  ctx: string,
  apiName: string,
): ApiErrorResponse {
  try {
    const err = getErr(_err, {
      ctx,
      apiName,
    });
    const { status, msg } = _getErrDetails(err);

    if (_shouldLogErr(err)) {
      const method = status < 500 ? 'warn' : 'error';
      ErrorLogger[method](err, { status, msg });
    }

    return {
      status,
      error: process.env.PRODUCTION
        ? { msg }
        : {
          msg,
          stack: err.stack?.split('\n'),
          debugCtx: err.debugCtx,
        },
    };
  } catch (err) {
    return {
      status: 500,
      error: process.env.PRODUCTION || !(err instanceof Error)
        ? { msg: 'Unknown error occurred.' }
        : {
          msg: 'Unknown error occurred.',
          stack: err.stack?.split('\n'),
          debugCtx: err.debugCtx,
        },
    };
  }
}

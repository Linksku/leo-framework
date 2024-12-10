import { ValidationError } from 'objection';
import { UniqueViolationError } from 'db-errors';

import ucFirst from 'utils/ucFirst';
import { PG_BT_PORT, MZ_PORT, PG_RR_PORT } from 'consts/infra';

function _shouldLogErr(err: Error): boolean {
  return TS.getProp(err, 'status') !== 469;
}

function _getErrDetails(err: Error): {
  status: number,
  code?: ApiErrorCode,
  msg: string,
  data?: ObjectOf<any>,
} {
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
      code: err.code,
      msg,
      data: err.data,
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

  if (!process.env.PRODUCTION) {
    // eslint-disable-next-line no-console
    console.error('formatAndLogApiErrorResponse: unknown error:', err);
  }
  return {
    status: 500,
    msg: 'Unknown error occurred.',
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
    const {
      status,
      code,
      msg,
      data,
    } = _getErrDetails(err);

    if (_shouldLogErr(err)) {
      const method = status < 500 ? 'warn' : 'error';
      ErrorLogger[method](
        err,
        {
          ...err.debugCtx,
          ...data,
          status,
          code,
          msg,
        },
      );
    }

    return {
      status,
      error: process.env.PRODUCTION
        ? { code, msg, data }
        : {
          code,
          msg,
          stack: err.stack?.split('\n'),
          data,
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

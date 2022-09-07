import { ValidationError } from 'objection';
import { UniqueViolationError } from 'db-errors';

import ucFirst from 'utils/ucFirst';

export default function formatApiErrorResponse(
  _err: unknown,
  name: string,
): ApiErrorResponse {
  printDebug(_err, `Api error in ${name}`);

  const err = _err instanceof Error
    ? _err
    : new Error(`formatApiErrorResponse: non-error was thrown: ${'_err'.slice(0, 100)}`);

  const stack = !process.env.PRODUCTION
    ? err.stack?.split('\n')
    : undefined;
  if (err instanceof ValidationError) {
    return {
      status: 400,
      error: {
        msg: err.message,
        stack,
      },
    };
  }
  if (err instanceof UniqueViolationError) {
    if (err.columns.length) {
      return {
        status: 400,
        error: {
          msg: `${ucFirst(err.table)} ${err.columns[0]} already exists.`,
          stack,
        },
      };
    }
    return {
      status: 400,
      error: {
        msg: `${ucFirst(err.table)} already exists.`,
        stack,
      },
    };
  }
  if (err instanceof UserFacingError) {
    return {
      status: err.status,
      error: {
        msg: err.message || err.toString(),
        stack,
        ...!process.env.PRODUCTION
          ? {
            debugCtx: err.debugCtx,
          }
          : null,
      },
    };
  }
  if (err instanceof ErrorWithCtx) {
    return {
      status: 500,
      error: {
        msg: err.message || err.toString(),
        stack,
        ...!process.env.PRODUCTION
          ? {
            debugCtx: err.debugCtx,
          }
          : null,
      },
    };
  }
  if (TS.hasDefinedProp(err, 'fatal')) {
    return {
      status: 503,
      error: {
        msg: 'Database unavailable.',
        stack,
      },
    };
  }
  if (TS.hasDefinedProp(err, 'code')
    && err.code === 'ECONNREFUSED'
    && TS.hasDefinedProp(err, 'port')) {
    if (err.port === TS.parseIntOrNull(process.env.PG_BT_PORT)) {
      return {
        status: 503,
        error: {
          msg: 'Database unavailable.',
          stack,
        },
      };
    }
    if (err.port === TS.parseIntOrNull(process.env.MZ_PORT)
      || err.port === TS.parseIntOrNull(process.env.PG_RR_PORT)) {
      return {
        status: 503,
        error: {
          msg: 'Database replica unavailable.',
          stack,
        },
      };
    }
  }
  return {
    status: 500,
    error: {
      msg: process.env.PRODUCTION
        ? 'Unknown error occurred.'
        : err.message || err.toString(),
      stack,
    },
  };
}

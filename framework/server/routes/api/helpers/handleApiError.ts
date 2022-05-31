import { ValidationError } from 'objection';
import { UniqueViolationError } from 'db-errors';

export default function handleApiError(
  _err: unknown,
  name: string,
): {
  status: number,
  errorData: ApiErrorData,
} {
  printDebug(_err, `Api error in ${name}`);

  const err = _err instanceof Error
    ? _err
    : new Error(`handleApiError: non-error was thrown: ${`_err`.slice(0, 100)}`);

  const stack = !process.env.PRODUCTION
    ? err.stack?.split('\n')
    : undefined;
  if (err instanceof ValidationError) {
    return {
      status: 400,
      errorData: {
        msg: err.message,
        stack,
      },
    };
  }
  if (err instanceof UniqueViolationError) {
    return {
      status: 400,
      errorData: {
        msg: `That ${err.constraint} already exists.`,
        stack,
      },
    };
  }
  if (err instanceof HandledError) {
    return {
      status: err.status,
      errorData: {
        msg: err.message || err.toString(),
        stack,
        ...!process.env.PRODUCTION
          ? {
            debugDetails: err.debugDetails instanceof Error
              ? err.debugDetails.stack
              : err.debugDetails,
          }
          : null,
      },
    };
  }
  if (TS.hasDefinedProp(err, 'fatal')) {
    return {
      status: 503,
      errorData: {
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
        errorData: {
          msg: 'Database unavailable.',
          stack,
        },
      };
    }
    if (err.port === TS.parseIntOrNull(process.env.MZ_PORT)
      || err.port === TS.parseIntOrNull(process.env.PG_RR_PORT)) {
      return {
        status: 503,
        errorData: {
          msg: 'Database replica unavailable.',
          stack,
        },
      };
    }
  }
  return {
    status: 500,
    errorData: {
      msg: process.env.PRODUCTION
        ? 'Unknown error occurred.'
        : err.message || err.toString(),
      stack,
    },
  };
}

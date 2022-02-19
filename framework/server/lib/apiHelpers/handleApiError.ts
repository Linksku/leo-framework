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

  const stack = process.env.NODE_ENV !== 'production'
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
        ...process.env.NODE_ENV !== 'production'
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
    if (err.port === TS.parseIntOrNull(process.env.POSTGRES_PORT)) {
      return {
        status: 503,
        errorData: {
          msg: 'Database unavailable.',
          stack,
        },
      };
    }
    if (err.port === TS.parseIntOrNull(process.env.MATERIALIZE_PORT)) {
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
      msg: process.env.NODE_ENV === 'production'
        ? 'Unknown error occurred.'
        : err.message || err.toString(),
      stack,
    },
  };
}

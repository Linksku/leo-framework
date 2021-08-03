import { ValidationError, UniqueViolationError } from 'objection';

export default function handleApiError(
  err: Error,
  name: string,
): {
  status: number,
  errorData: ApiErrorData,
} {
  console.error(name, err);

  const stack = process.env.NODE_ENV === 'production' ? undefined : err.stack?.split('\n');
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
        ...process.env.NODE_ENV !== 'production' ? { debugDetails: err.debugDetails } : null,
      },
    };
  }
  if ('fatal' in err) {
    return {
      status: 503,
      errorData: {
        msg: 'Database unavailable.',
        stack,
      },
    };
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

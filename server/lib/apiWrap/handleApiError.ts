import { ValidationError, UniqueViolationError } from 'objection';

import type { RouteRet } from 'services/ApiManager';

export default function handleApiError(
  err: Error,
  name: string,
): {
  status: number,
  errorData: RouteRet<any>['error'],
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
        title: `That ${err.constraint} already exists.`,
        msg: `That ${err.constraint} already exists.`,
        stack,
      },
    };
  }
  if (err instanceof HandledError) {
    return {
      status: err.status,
      errorData: {
        title: err.message,
        msg: err.message || err.toString(),
        stack,
        debugDetails: process.env.NODE_ENV === 'production'
          ? null
          : err.debugDetails,
      },
    };
  }
  if ('fatal' in err) {
    return {
      status: 503,
      errorData: {
        title: 'Database unavailable.',
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

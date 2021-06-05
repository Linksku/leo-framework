import { ValidationError, UniqueViolationError } from 'objection';

export default function handleApiError(
  res: ExpressResponse,
  err: Error,
  name: string,
) {
  console.error(name, err);

  const stack = process.env.NODE_ENV === 'production' ? null : err.stack?.split('\n');
  if (err instanceof ValidationError) {
    res.status(400).json({
      error: {
        msg: err.message,
        stack,
      },
    });
  } else if (err instanceof UniqueViolationError) {
    res.status(400).json({
      error: {
        title: `That ${err.constraint} already exists.`,
        msg: `That ${err.constraint} already exists.`,
        stack,
      },
    });
  } else if (err instanceof HandledError) {
    res.status(err.status).json({
      error: {
        title: err.message,
        msg: err.message || err.toString(),
        stack,
        debugDetails: process.env.NODE_ENV === 'production'
          ? null
          : err.debugDetails,
      },
    });
  } else if ('fatal' in err) {
    res.status(503).json({
      error: {
        title: 'Database unavailable.',
        msg: 'Database unavailable.',
        stack,
      },
    });
  } else {
    res.status(500).json({
      error: {
        msg: process.env.NODE_ENV === 'production'
          ? 'Unknown error occurred.'
          : err.message || err.toString(),
        stack,
      },
    });
  }
}

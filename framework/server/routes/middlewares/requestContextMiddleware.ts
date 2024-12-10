import type { NextFunction } from 'express';

import RequestContextLocalStorage, { createRequestContext } from 'core/requestContext/RequestContextLocalStorage';

export default function requestContextMiddleware(
  req: ExpressRequest,
  _res: ExpressResponse,
  next: NextFunction,
) {
  RequestContextLocalStorage.run(
    createRequestContext(req),
    () => {
      next();
    },
  );
}

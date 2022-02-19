import type { NextFunction } from 'express';

import RequestContextLocalStorage, { createRequestContext } from 'services/RequestContextLocalStorage';

export default function requestContextMiddleware(
  req: ExpressRequest,
  res: ExpressResponse,
  next: NextFunction,
) {
  RequestContextLocalStorage.run(
    createRequestContext(req),
    () => {
      req.rc = TS.defined(RequestContextLocalStorage.getStore());
      next();
    },
  );
}

import type { NextFunction } from 'express';

import { fetchUserIdByJwt } from 'api/helpers/auth/jwt';

export default async function addUserMiddleware(
  req: ExpressRequest,
  res: ExpressResponse,
  next: NextFunction,
) {
  const cookieJwt = TS.isObj(req.cookies) && typeof req.cookies.authToken === 'string'
    ? req.cookies.authToken
    : undefined;
  const headerJwt = req.headers.authorization;

  if (cookieJwt && headerJwt) {
    req.currentUserId = (await fetchUserIdByJwt(cookieJwt, headerJwt)) ?? undefined;
  } else if (cookieJwt) {
    res.clearCookie('authToken');
  }

  next();
}

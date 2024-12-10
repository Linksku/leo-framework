import { createSecretKey } from 'crypto';
import JWT, { SignOptions, TokenExpiredError, VerifyOptions } from 'jsonwebtoken';

import type { JwtPayloads } from 'config/jwtPayloads';
import { DEFAULT_COOKIES_TTL } from 'consts/server';

const jwtKey = process.env.PRODUCTION
  ? process.env.PROD_JWT_KEY
  : process.env.DEV_JWT_KEY;
export const keyObj = createSecretKey(Buffer.from(jwtKey));

const DEFAULT_HEADER_ENCODED = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.';

type AuthPayload = {
  id: IUser['id'],
};

type CoreJwtPayloads = {
  'cookie': AuthPayload,
  'header': AuthPayload,
  'sse': AuthPayload,
  'resetPassword': {
    userId: IUser['id'],
  },
  unsubEmail:
    | { email: string }
    | { userId: IUser['id'], channel: NotifChannel },
  'verifyEmail': {
    userId: IUser['id'],
    email: string,
  },
};

type AllJwtPayloads = JwtPayloads & CoreJwtPayloads;

export function signJwt<T extends keyof AllJwtPayloads>(
  type: T,
  payload: AllJwtPayloads[T],
  opts?: SignOptions,
): Promise<string> {
  return new Promise<string>((succ, fail) => {
    JWT.sign(
      {
        ...payload,
        type,
      },
      keyObj,
      {
        algorithm: 'HS256',
        noTimestamp: true,
        expiresIn: DEFAULT_COOKIES_TTL / 1000,
        ...opts,
      },
      (err, token) => {
        if (err) {
          fail(err);
        } else if (!token) {
          fail(new Error('signJwt: couldn\'t create JWT'));
        } else if (token.startsWith(DEFAULT_HEADER_ENCODED)) {
          succ(token.slice(DEFAULT_HEADER_ENCODED.length));
        } else {
          succ(token);
        }
      },
    );
  });
}

export function verifyJwt<
  T extends keyof AllJwtPayloads,
  ThrowErr extends boolean,
  Ret extends ThrowErr extends true ? AllJwtPayloads[T] : AllJwtPayloads[T] | null,
>(
  type: T,
  jwtStr: string,
  validate: (payload: ObjectOf<any>) => boolean,
  opts?: {
    throwErr?: ThrowErr,
  } & VerifyOptions,
): Promise<Ret> {
  return new Promise<AllJwtPayloads[T] | null>(succ => {
    JWT.verify(
      jwtStr.split('.').length === 2
        ? DEFAULT_HEADER_ENCODED + jwtStr
        : jwtStr,
      keyObj,
      {
        algorithms: ['HS256'],
        ...opts,
      },
      (err, obj) => {
        if (err && opts?.throwErr) {
          if (err instanceof TokenExpiredError) {
            throw new UserFacingError('Token expired', 400);
          }
          throw new UserFacingError('Invalid token', 400);
        } else if (err) {
          succ(null);
        } else if (!TS.isObj(obj)
          || !TS.hasProp(obj, 'type')
          || obj.type !== type
          || !validate(obj)) {
          if (opts?.throwErr) {
            throw new UserFacingError('Invalid token', 400);
          }
          succ(null);
        } else {
          succ(obj as unknown as AllJwtPayloads[T]);
        }
      },
    );
  }) as Promise<Ret>;
}

export async function fetchUserIdByJwt(
  cookieJwt: Nullish<string>,
  headerJwt: Nullish<string>,
): Promise<IUser['id'] | null> {
  if (!cookieJwt || !headerJwt) {
    return null;
  }

  const { cookieVerified, headerVerified } = await promiseObj({
    cookieVerified: verifyJwt(
      'cookie',
      cookieJwt,
      payload => typeof payload.id === 'number' && payload.id > 0,
    ),
    headerVerified: verifyJwt(
      'header',
      headerJwt,
      payload => typeof payload.id === 'number' && payload.id > 0,
    ),
  });

  if (!cookieVerified || !headerVerified || cookieVerified.id !== headerVerified.id) {
    return null;
  }

  return cookieVerified.id;
}

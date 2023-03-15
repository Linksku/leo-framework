import jwt from 'jsonwebtoken';
import { createSecretKey } from 'crypto';

import { DEFAULT_COOKIES_TTL } from 'settings';

export const COOKIE_JWT_KEY = createSecretKey(Buffer.from(process.env.COOKIE_JWT_KEY));

export const HEADER_JWT_KEY = createSecretKey(Buffer.from(process.env.HEADER_JWT_KEY));

export const SSE_JWT_KEY = createSecretKey(Buffer.from(process.env.SSE_JWT_KEY));

export async function fetchUserIdByJwt(cookieJwt?: string, headerJwt?: string) {
  if (!cookieJwt || !headerJwt) {
    return null;
  }

  const { cookieVerified, headerVerified } = await promiseObj({
    cookieVerified: new Promise<number | null>(succ => {
      jwt.verify(
        cookieJwt,
        COOKIE_JWT_KEY,
        {},
        (err, obj: any) => {
          if (err) {
            succ(null);
          } else {
            succ(obj?.id);
          }
        },
      );
    }),
    headerVerified: new Promise<number | null>(succ => {
      jwt.verify(
        headerJwt,
        HEADER_JWT_KEY,
        {},
        (err, obj: any) => {
          if (err) {
            succ(null);
          } else {
            succ(obj?.id);
          }
        },
      );
    }),
  });

  if (!cookieVerified || !headerVerified || cookieVerified !== headerVerified) {
    return null;
  }

  return cookieVerified;
}

export async function getCookieJwt(userId: EntityId) {
  return new Promise<string>((succ, fail) => {
    jwt.sign(
      {
        id: userId,
      },
      COOKIE_JWT_KEY,
      {
        expiresIn: DEFAULT_COOKIES_TTL,
      },
      (err, token) => {
        if (err) {
          fail(err);
        } else if (!token) {
          fail(new Error('getCookieJwt: couldn\'t create cookie JWT'));
        } else {
          succ(token);
        }
      },
    );
  });
}

export async function getHeaderJwt(userId: EntityId) {
  return new Promise<string>((succ, fail) => {
    jwt.sign(
      {
        id: userId,
      },
      HEADER_JWT_KEY,
      {
        expiresIn: DEFAULT_COOKIES_TTL,
      },
      (err, token) => {
        if (err) {
          fail(err);
        } else if (!token) {
          fail(new Error('getHeaderJwt: couldn\'t create header JWT'));
        } else {
          succ(token);
        }
      },
    );
  });
}

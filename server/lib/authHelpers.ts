import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

import { DEFAULT_AUTH_EXPIRATION } from 'serverSettings';

export async function fetchUserIdByJwt(cookieJwt?: string, headerJwt?: string) {
  if (!cookieJwt || !headerJwt) {
    return null;
  }

  const { cookieVerified, headerVerified } = await promiseObj({
    cookieVerified: new Promise<number | null>(succ => {
      jwt.verify(
        cookieJwt,
        TS.defined(process.env.COOKIE_JWT_KEY),
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
        TS.defined(process.env.HEADER_JWT_KEY),
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

export async function isPasswordValid(actualPassword: string, inputPassword?: string) {
  if (!inputPassword) {
    return false;
  }
  return bcrypt.compare(
    `${inputPassword}${process.env.PASSWORD_PEPPER}`,
    actualPassword.toString(),
  );
}

export async function getCookieJwt(userId: number) {
  return new Promise<string>((succ, fail) => {
    jwt.sign(
      {
        id: userId,
      },
      TS.defined(process.env.COOKIE_JWT_KEY),
      {
        expiresIn: DEFAULT_AUTH_EXPIRATION,
      },
      (err, token) => {
        if (err) {
          fail(err);
        } else if (!token) {
          fail(new Error('Couldn\'t create cookie JWT.'));
        } else {
          succ(token);
        }
      },
    );
  });
}

export async function getHeaderJwt(userId: number) {
  return new Promise<string>((succ, fail) => {
    jwt.sign(
      {
        id: userId,
      },
      TS.defined(process.env.HEADER_JWT_KEY),
      {
        expiresIn: DEFAULT_AUTH_EXPIRATION,
      },
      (err, token) => {
        if (err) {
          fail(err);
        } else if (!token) {
          fail(new Error('Couldn\'t create header JWT.'));
        } else {
          succ(token);
        }
      },
    );
  });
}

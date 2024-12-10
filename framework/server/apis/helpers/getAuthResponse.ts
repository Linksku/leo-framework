import type { CookieOptions } from 'express-serve-static-core';

import { signJwt } from 'core/jwt';
import { API_DOMAIN_NAME, DEFAULT_COOKIES_TTL } from 'consts/server';

export function getUserDataSchema({ required, properties }: {
  required?: string[],
  properties?: ObjectOf<JsonSchema>,
} = {}) {
  return TS.literal({
    type: 'object',
    required: ['currentUserId', 'authToken', ...(required ?? [])],
    properties: {
      currentUserId: SchemaConstants.id,
      authToken: SchemaConstants.content,
      ...properties,
    },
    additionalProperties: false,
  } as const);
}

export default async function getAuthResponse<OtherData extends ObjectOf<unknown>>(
  userId: EntityId,
  otherData?: OtherData,
): Promise<{
  data: {
    currentUserId: EntityId,
    authToken: string,
  } & OtherData,
  cookies: {
    authToken: {
      val: string,
      opts: CookieOptions,
    },
  },
}> {
  const { cookieJwt, headerJwt } = await promiseObj({
    cookieJwt: signJwt('cookie', { id: userId }),
    headerJwt: signJwt('header', { id: userId }),
  });
  return {
    data: {
      currentUserId: userId,
      authToken: headerJwt,
      ...(otherData as OtherData),
    },
    cookies: {
      authToken: {
        val: cookieJwt,
        opts: {
          maxAge: DEFAULT_COOKIES_TTL,
          httpOnly: true,
          ...(process.env.SERVER === 'production'
            ? {
              secure: true,
              sameSite: 'none',
              domain: API_DOMAIN_NAME,
            }
            : null),
        } satisfies CookieOptions,
      },
    },
  };
}

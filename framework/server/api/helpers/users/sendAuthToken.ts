import { signJwt } from 'api/helpers/auth/jwt';
import { DOMAIN_NAME, DEFAULT_COOKIES_TTL } from 'consts/server';

export const userDataSchema = TS.literal({
  type: 'object',
  required: ['currentUserId', 'authToken'],
  properties: {
    currentUserId: SchemaConstants.id,
    authToken: SchemaConstants.content,
  },
  additionalProperties: false,
} as const);

export default async function sendAuthToken(userId: EntityId, res: ExpressResponse) {
  const { cookieJwt, headerJwt } = await promiseObj({
    cookieJwt: signJwt('cookie', { id: userId }),
    headerJwt: signJwt('header', { id: userId }),
  });
  // todo: low/easy include cookies in api return value.
  res.cookie('authToken', cookieJwt, {
    maxAge: DEFAULT_COOKIES_TTL,
    httpOnly: true,
    ...(process.env.SERVER === 'production'
      ? {
        secure: true,
        sameSite: 'none',
        domain: `.${DOMAIN_NAME}`,
      }
      : null),
  });
  return {
    currentUserId: userId,
    authToken: headerJwt,
  };
}

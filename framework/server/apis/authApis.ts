import JWT from 'jsonwebtoken';

import { defineApi } from 'services/ApiManager';
import {
  APP_NAME,
  GOOGLE_CLIENT_ID_ANDROID,
  GOOGLE_CLIENT_ID_IOS,
  GOOGLE_CLIENT_ID_WEB,
} from 'config';
import { HOME_URL } from 'consts/server';
import { registerUser, getPasswordInvalidReason } from 'features/users/registerUser';
import { signJwt, verifyJwt } from 'core/jwt';
import { getPasswordHash } from 'features/users/userPasswords';
import sendVerifyEmailEmail from 'features/users/sendVerifyEmailEmail';
import getUserByEmailPassword from 'features/users/getUserByEmailPassword';
import getAuthResponse, { getUserDataSchema } from 'apis/helpers/getAuthResponse';
import setUserEmailVerified from 'features/users/setUserEmailVerified';
import randInt from 'utils/randInt';
import consumeRateLimit from 'services/redis/consumeRateLimit';
import { GOOGLE_LOGIN_ID, APPLE_LOGIN_ID } from 'consts/coreUserMetaKeys';
import { PLATFORM_TYPES } from 'core/requestContext/RequestContextLocalStorage';
import sendSimpleEmail from 'services/email/sendSimpleEmail';

async function getGoogleOAuthClient() {
  const { OAuth2Client } = await import('google-auth-library');
  return new OAuth2Client();
}

async function getAppleJwksClient() {
  const { default: JWKS } = await import('jwks-rsa');
  return JWKS({
    jwksUri: 'https://appleid.apple.com/auth/keys',
  });
}

defineApi(
  {
    method: 'post',
    name: 'registerUser',
    paramsSchema: {
      type: 'object',
      required: [
        'email',
        'password',
        'name',
        'birthday',
        'platform',
        'deviceId',
      ],
      properties: {
        email: SchemaConstants.email,
        password: SchemaConstants.password,
        name: SchemaConstants.name,
        birthday: SchemaConstants.dateStr,
        platform: {
          type: 'string',
          enum: PLATFORM_TYPES,
        },
        deviceId: SchemaConstants.content,
      },
      additionalProperties: false,
    },
    dataSchema: getUserDataSchema({
      required: ['isExisting'],
      properties: {
        isExisting: { type: 'boolean' },
      },
    }),
  },
  async function registerUserApi({
    email,
    password,
    name,
    birthday,
    platform,
    deviceId,
    currentUserId,
    userAgent,
  }: ApiHandlerParams<'registerUser'>) {
    if (currentUserId) {
      throw new UserFacingError('Already logged in.', 400);
    }

    const { user, isExisting } = await registerUser({
      email,
      password,
      name,
      birthday,
    });

    if (!isExisting) {
      await Promise.all([
        sendVerifyEmailEmail(user, true)
          .catch(err => {
            ErrorLogger.warn(err, { ctx: 'registerUserApi: sendVerifyEmailEmail' });
          }),
        UserDeviceModel.insertOne({
          userId: user.id,
          platform,
          deviceId,
          lastSeenTime: new Date(),
          userAgent: userAgent ? userAgent.slice(0, 2048) : null,
          registrationToken: null,
        }, { onDuplicate: 'update' })
          .catch(err => {
            ErrorLogger.warn(err, { ctx: 'registerUserApi: UserDeviceModel.insertOne' });
          }),
      ]);
    }

    return getAuthResponse(user.id, { isExisting });
  },
);

defineApi(
  {
    method: 'post',
    name: 'googleLoginUser',
    paramsSchema: {
      type: 'object',
      required: ['token', 'type'],
      properties: {
        token: { type: 'string' },
        type: { type: 'string', enum: ['login', 'register'] },
      },
      additionalProperties: false,
    },
    dataSchema: getUserDataSchema({
      required: ['isExisting'],
      properties: {
        isExisting: { type: 'boolean' },
      },
    }),
  },
  async function googleLoginUserApi({
    token,
    type,
    currentUserId,
  }: ApiHandlerParams<'googleLoginUser'>) {
    if (currentUserId) {
      throw new UserFacingError('Already logged in.', 400);
    }

    const GoogleOAuth = await getGoogleOAuthClient();
    const ticket = await GoogleOAuth.verifyIdToken({
      idToken: token,
      audience: [GOOGLE_CLIENT_ID_WEB, GOOGLE_CLIENT_ID_ANDROID, GOOGLE_CLIENT_ID_IOS],
    });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.name) {
      throw new UserFacingError('Failed to retrieve email from Google', 400);
    }

    let { user, btUser } = await promiseObj({
      user: UserModel.selectOne({ email: payload.email.toLowerCase() }),
      btUser: await entityQuery(UserModel, 'bt')
        .where('email', payload.email.toLowerCase())
        .first(),
    });
    const isExisting = !!user;

    if (!user && btUser) {
      throw new UserFacingError('Service temporarily unavailable, please try again later.', 503);
    }

    if (!user && type === 'register') {
      const tmp = await registerUser({
        email: payload.email,
        password: null,
        name: payload.name,
        birthday: null,
        is3rdPartyAuth: true,
        isEmailVerified: !!payload.email_verified,
      });
      user = tmp.user;

      const subjectId = ticket.getPayload()?.sub;
      if (subjectId) {
        await UserMetaModel.insertOne({
          userId: user.id,
          metaKey: GOOGLE_LOGIN_ID,
          metaValue: subjectId,
        });
      }
    }

    if (!user || user.isDeleted) {
      if (type === 'login') {
        throw new UserFacingError(
          `This Google account isn't associated with any ${APP_NAME} account yet.`,
          {
            status: 401,
            data: {
              // todo: low/med schema for error data
              email: payload.email.toLowerCase(),
            },
          },
        );
      } else {
        throw new UserFacingError('Unknown error occurred while creating account.', 400);
      }
    }

    return getAuthResponse(user.id, { isExisting });
  },
);

defineApi(
  {
    method: 'post',
    name: 'appleLoginUser',
    paramsSchema: {
      type: 'object',
      required: ['type', 'jwt'],
      properties: {
        type: { type: 'string', enum: ['login', 'register'] },
        name: { ...SchemaConstants.name, minLength: 0 },
        jwt: { type: 'string' },
      },
      additionalProperties: false,
    },
    dataSchema: getUserDataSchema({
      required: ['isExisting'],
      properties: {
        isExisting: { type: 'boolean' },
      },
    }),
  },
  async function appleLoginUserApi({
    type,
    name,
    jwt,
    currentUserId,
  }: ApiHandlerParams<'appleLoginUser'>) {
    if (currentUserId) {
      throw new UserFacingError('Already logged in.', 400);
    }

    const decoded = JWT.decode(jwt, { complete: true });
    if (!decoded?.header.kid) {
      throw new UserFacingError('Invalid token from Apple', 400);
    }
    const AppleJwksClient = await getAppleJwksClient();
    const keys = await AppleJwksClient.getSigningKey(decoded.header.kid);
    const publicKey = keys.getPublicKey();
    if (!JWT.verify(jwt, publicKey, { algorithms: ['RS256'] })
      || typeof decoded.payload === 'string') {
      throw new UserFacingError('Invalid token from Apple', 400);
    }

    const { email, email_verified: emailVerified, sub: subjectId } = decoded.payload;
    if (!email || typeof email !== 'string') {
      throw new UserFacingError('Couldn\'t get email from Apple', 400);
    }

    // Maybe handle @privaterelay.appleid.com differently
    let { user, btUser } = await promiseObj({
      user: UserModel.selectOne({ email: email.toLowerCase() }),
      btUser: await entityQuery(UserModel, 'bt')
        .where('email', email.toLowerCase())
        .first(),
    });
    const isExisting = !!user;

    if (!user && btUser) {
      throw new UserFacingError('Service temporarily unavailable, please try again later.', 503);
    }

    if (!user && type === 'register') {
      if (!name) {
        throw new UserFacingError('Couldn\'t get name from Apple', 400);
      }

      const tmp = await registerUser({
        email,
        password: null,
        name,
        birthday: null,
        is3rdPartyAuth: true,
        isEmailVerified: !!emailVerified,
      });
      user = tmp.user;

      if (subjectId) {
        await UserMetaModel.insertOne({
          userId: user.id,
          metaKey: APPLE_LOGIN_ID,
          metaValue: subjectId,
        });
      }
    }

    if (!user || user.isDeleted) {
      if (type === 'login') {
        throw new UserFacingError(
          `This Apple account isn't associated with any ${APP_NAME} account yet.`,
          {
            status: 401,
            data: {
              email: email.toLowerCase(),
            },
          },
        );
      } else {
        throw new UserFacingError('Unknown error occurred while creating account.', 400);
      }
    }

    return getAuthResponse(user.id, { isExisting });
  },
);

defineApi(
  {
    method: 'post',
    name: 'loginUser',
    paramsSchema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: SchemaConstants.email,
        password: SchemaConstants.password,
      },
      additionalProperties: false,
    },
    dataSchema: getUserDataSchema(),
  },
  async function loginUserApi({
    email,
    password,
    currentUserId,
  }: ApiHandlerParams<'loginUser'>) {
    if (currentUserId) {
      throw new UserFacingError('Already logged in.', 400);
    }

    const {
      user,
      btUser,
      userAuth,
      isCorrect,
    } = await getUserByEmailPassword(email, password);
    if (!user && btUser) {
      throw new UserFacingError('Service temporarily unavailable, please try again later.', 503);
    }
    if (!isCorrect && userAuth && !userAuth.password) {
      throw new UserFacingError('Reset your password to log in to this account.', 401);
    }

    if (!isCorrect || !user) {
      await pause(500);
      throw new UserFacingError('Email or password is incorrect.', 401);
    }

    return getAuthResponse(user.id);
  },
);

defineApi(
  {
    method: 'post',
    name: 'resetPassword',
    paramsSchema: {
      type: 'object',
      required: ['email'],
      properties: {
        email: SchemaConstants.email,
      },
      additionalProperties: false,
    },
  },
  async function resetPasswordApi({ email }: ApiHandlerParams<'resetPassword'>) {
    email = email.toLowerCase();
    const user = await UserModel.selectOne({ email });
    if (!user || user.isDeleted) {
      await pause(randInt(0, 1000));
      return { data: null };
    }

    if (await UnsubEmailModel.selectOne({ email })) {
      throw new UserFacingError(`The owner of this email has blocked emails from ${APP_NAME}.`, 400);
    }

    await consumeRateLimit({
      type: 'resetPassword',
      errMsg: 'Sent password reset email recently.',
      key: user.id,
    });

    const { verifyToken, unsubToken } = await promiseObj({
      verifyToken: signJwt(
        'resetPassword',
        { userId: user.id },
        { expiresIn: '1h' },
      ),
      unsubToken: signJwt(
        'unsubEmail',
        { email: user.email },
      ),
    });
    const url = `${HOME_URL}/resetPasswordVerify?token=${verifyToken}`;
    const unsubUrl = `${HOME_URL}/unsub?token=${unsubToken}`;
    try {
      await sendSimpleEmail({
        to: email,
        subject: `[${APP_NAME}] Password reset link`,
        body: [
          `Hi ${user.name},`,
          'Someone requested a password reset for your account. To reset your password, please visit this link:',
          { url },
          'This link will expire in 1 hour. If you didn\'t make this request, you can ignore this email.',
        ],
        unsubUrl,
        unsubText: 'Block email',
      });
    } catch (err) {
      throw new UserFacingError(
        'Failed to send email, please try again later',
        {
          status: 500,
          debugCtx: {
            ...(err instanceof Error && err.debugCtx),
            origErr: err,
          },
        },
      );
    }

    return {
      data: null,
    };
  },
);

defineApi(
  {
    method: 'post',
    name: 'verifyResetPassword',
    paramsSchema: {
      type: 'object',
      required: ['token', 'password'],
      properties: {
        token: { type: 'string' },
        password: SchemaConstants.password,
      },
      additionalProperties: false,
    },
    dataSchema: getUserDataSchema(),
  },
  async function verifyResetPasswordApi({
    token,
    password,
  }: ApiHandlerParams<'verifyResetPassword'>) {
    if (!token) {
      throw new UserFacingError('Invalid token', 400);
    }

    const invalidPasswordReason = getPasswordInvalidReason(password);
    if (invalidPasswordReason) {
      throw new UserFacingError(invalidPasswordReason, 400);
    }

    const decoded = await verifyJwt(
      'resetPassword',
      token,
      payload => typeof payload.userId === 'number' && payload.userId > 0,
    );
    if (!decoded) {
      throw new UserFacingError('Invalid token', 400);
    }

    await UserAuthModel.updateOne(
      { userId: decoded.userId },
      { password: await getPasswordHash(password) },
    );

    return getAuthResponse(decoded.userId);
  },
);

defineApi(
  {
    method: 'post',
    name: 'sendEmailVerification',
    auth: true,
    paramsSchema: SchemaConstants.emptyObj,
  },
  async function sendEmailVerificationApi({
    currentUserId,
  }: ApiHandlerParams<'sendEmailVerification'>) {
    const currentUser = await UserModel.selectOne({ id: currentUserId });
    if (!currentUser || currentUser.isDeleted) {
      throw new UserFacingError('Unknown error.', 400);
    }

    try {
      await sendVerifyEmailEmail(currentUser, true);
    } catch (err) {
      throw new UserFacingError(
        'Failed to send verification email',
        {
          status: 500,
          debugCtx: { origErr: err, ctx: 'sendEmailVerificationApi: sendVerifyEmailEmail' },
        },
      );
    }

    return { data: null };
  },
);

defineApi(
  {
    method: 'post',
    name: 'verifyEmail',
    paramsSchema: {
      type: 'object',
      required: ['token'],
      properties: {
        token: { type: 'string' },
      },
      additionalProperties: false,
    },
    dataSchema: {
      type: 'object',
      required: ['hasVerified'],
      properties: {
        hasVerified: { type: 'boolean' },
      },
      additionalProperties: false,
    },
  },
  async function verifyEmailApi({
    token,
  }: ApiHandlerParams<'verifyEmail'>) {
    if (!token) {
      throw new UserFacingError('Invalid token', 400);
    }

    const decoded = await verifyJwt(
      'verifyEmail',
      token,
      payload => typeof payload.userId === 'number' && payload.userId > 0
        && typeof payload.email === 'string',
      { throwErr: true },
    );

    await setUserEmailVerified(decoded.userId, decoded.email);

    return {
      data: { hasVerified: true },
    };
  },
);

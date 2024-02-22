import { encode } from 'html-entities';
import { OAuth2Client } from 'google-auth-library';
import JWKS from 'jwks-rsa';
import JWT from 'jsonwebtoken';

import { defineApi } from 'services/ApiManager';
import sendEmail from 'services/sendEmail';
import {
  APP_NAME,
  GOOGLE_CLIENT_ID_ANDROID,
  GOOGLE_CLIENT_ID_IOS,
  GOOGLE_CLIENT_ID_WEB,
} from 'config';
import { HOME_URL } from 'consts/server';
import { registerUser, getPasswordInvalidReason } from 'api/helpers/users/registerUser';
import { signJwt, verifyJwt } from 'api/helpers/auth/jwt';
import { getPasswordHash } from 'api/helpers/auth/passwords';
import sendVerifyEmailEmail from 'api/helpers/auth/sendVerifyEmailEmail';
import getUserByEmailPassword from 'api/helpers/users/getUserByEmailPassword';
import sendAuthToken, { userDataSchema } from 'api/helpers/users/sendAuthToken';
import setUserEmailVerified from 'api/helpers/users/setUserEmailVerified';
import randInt from 'utils/randInt';
import consumeRateLimit from 'services/consumeRateLimit';

const GoogleOAuth = new OAuth2Client();

const AppleJwksClient = JWKS({
  jwksUri: 'https://appleid.apple.com/auth/keys',
});

defineApi(
  {
    method: 'post',
    name: 'registerUser',
    paramsSchema: {
      type: 'object',
      required: ['email', 'password', 'name', 'birthday'],
      properties: {
        email: SchemaConstants.email,
        password: SchemaConstants.password,
        name: SchemaConstants.name,
        birthday: SchemaConstants.dateStr,
      },
      additionalProperties: false,
    },
    dataSchema: userDataSchema,
  },
  async function registerUserApi({
    email,
    password,
    name,
    birthday,
    currentUserId,
  }: ApiHandlerParams<'registerUser'>, res) {
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
      sendVerifyEmailEmail(user, true)
        .catch(err => {
          ErrorLogger.error(err, { ctx: 'registerUserApi: sendVerifyEmailEmail' });
        });
    }

    return {
      data: await sendAuthToken(user.id, res),
    };
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
    dataSchema: userDataSchema,
  },
  async function googleLoginUserApi({
    token,
    type,
    currentUserId,
  }: ApiHandlerParams<'googleLoginUser'>, res) {
    if (currentUserId) {
      throw new UserFacingError('Already logged in.', 400);
    }

    const ticket = await GoogleOAuth.verifyIdToken({
      idToken: token,
      audience: [GOOGLE_CLIENT_ID_WEB, GOOGLE_CLIENT_ID_ANDROID, GOOGLE_CLIENT_ID_IOS],
    });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.name) {
      throw new UserFacingError('Failed to retrieve email from Google', 400);
    }

    let user = await UserModel.selectOne({ email: payload.email.toLowerCase() });
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
    }

    if (!user || user.isDeleted) {
      if (type === 'login') {
        throw new UserFacingError(
          `This Google account isn't associated with any ${APP_NAME} accounts. Please sign up or try a different Google account.`,
          401,
        );
      } else {
        throw new UserFacingError('Unknown error occurred while creating account.', 400);
      }
    }

    return {
      data: await sendAuthToken(user.id, res),
    };
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
    dataSchema: userDataSchema,
  },
  async function appleLoginUserApi({
    type,
    name,
    jwt,
    currentUserId,
  }: ApiHandlerParams<'appleLoginUser'>, res) {
    if (currentUserId) {
      throw new UserFacingError('Already logged in.', 400);
    }

    const decoded = JWT.decode(jwt, { complete: true });
    if (!decoded?.header.kid) {
      throw new UserFacingError('Invalid token from Apple', 400);
    }
    const keys = await AppleJwksClient.getSigningKey(decoded.header.kid);
    const publicKey = keys.getPublicKey();
    if (!JWT.verify(jwt, publicKey, { algorithms: ['RS256'] })
      || typeof decoded.payload === 'string') {
      throw new UserFacingError('Invalid token from Apple', 400);
    }

    const { email, email_verified: emailVerified } = decoded.payload;
    if (!email || typeof email !== 'string') {
      throw new UserFacingError('Couldn\'t get email from Apple', 400);
    }

    // Maybe handle @privaterelay.appleid.com differently
    let user = await UserModel.selectOne({
      email: email.toLowerCase(),
    });
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
    }

    if (!user || user.isDeleted) {
      if (type === 'login') {
        throw new UserFacingError(
          `This Apple account isn't associated with any ${APP_NAME} accounts. Please sign up or try a different Apple account.`,
          401,
        );
      } else {
        throw new UserFacingError('Unknown error occurred while creating account.', 400);
      }
    }

    return {
      data: await sendAuthToken(user.id, res),
    };
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
    dataSchema: userDataSchema,
  },
  async function loginUserApi({
    email,
    password,
    currentUserId,
  }: ApiHandlerParams<'loginUser'>, res) {
    if (currentUserId) {
      throw new UserFacingError('Already logged in.', 400);
    }

    const user = await getUserByEmailPassword(email, password);
    if (!user) {
      throw new UserFacingError('Email or password is incorrect.', 401);
    }

    return {
      data: await sendAuthToken(user.id, res),
    };
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
    const user = await UserModel.selectOne({ email: email.toLowerCase() });
    if (!user || user.isDeleted) {
      await pause(randInt(0, 1000));
      return { data: null };
    }

    await consumeRateLimit({
      type: 'resetPasswordApi',
      duration: 10 * 60,
      maxCount: 1,
      errMsg: 'Sent password reset email recently.',
      key: user.id,
    });

    const token = await signJwt(
      'resetPassword',
      { userId: user.id },
      { expiresIn: '1h' },
    );
    const url = `${HOME_URL}/resetPasswordVerify?token=${token}`;
    try {
      await sendEmail(
        email,
        `[${APP_NAME}] Password reset link`,
        `
Hi ${user.name},

Someone requested a password reset for your account. To reset your password, please visit this link:
${url}

This link will expire in 1 hour. If you didn't make this request, you can ignore this email.

${APP_NAME}
`,
        `
<p>Hi ${encode(user.name)},</p>
<p>Someone requested a password reset for your account. To reset your password, please visit this link:</p>
<p><a href="${url}">${url}</a></p>
<p>This link will expire in 1 hour. If you didn't make this request, you can ignore this email.</p>
<p>${APP_NAME}</p>
`,
      );
    } catch (err) {
      throw new UserFacingError(
        'Failed to send email, please try again later',
        500,
        { ...(err instanceof Error && err.debugCtx), origErr: err },
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
    dataSchema: userDataSchema,
  },
  async function verifyResetPasswordApi({
    token,
    password,
  }: ApiHandlerParams<'verifyResetPassword'>, res) {
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

    return {
      data: await sendAuthToken(decoded.userId, res),
    };
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
    await sendVerifyEmailEmail(currentUser, true);

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

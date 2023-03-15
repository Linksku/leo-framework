import crypto from 'crypto';
import { UniqueViolationError } from 'db-errors';

import { defineApi } from 'services/ApiManager';
import sendEmail from 'services/sendEmail';
import { RESET_PASSWORD_HASH } from 'consts/coreUserMetaKeys';
import {
  APP_NAME,
  HOME_URL,
  DOMAIN_NAME,
  DEFAULT_COOKIES_TTL,
} from 'settings';
import { getBirthdayInvalidReason, getNameInvalidReason, getPasswordInvalidReason } from 'helpers/users/validateUser';
import { getCookieJwt, getHeaderJwt } from 'helpers/auth/jwt';
import { getPasswordHash, isPasswordValid } from 'helpers/auth/passwords';
import waitForUserInsert from 'config/waitForUserInsert';
import knexBT from 'services/knex/knexBT';

const dataSchema = TS.literal({
  type: 'object',
  required: ['currentUserId', 'authToken'],
  properties: {
    currentUserId: SchemaConstants.id,
    authToken: { type: 'string' },
  },
  additionalProperties: false,
} as const);

async function _sendAuthToken(userId: EntityId, res: ExpressResponse) {
  const { cookieJwt, headerJwt } = await promiseObj({
    cookieJwt: getCookieJwt(userId),
    headerJwt: getHeaderJwt(userId),
  });
  // todo: low/mid include cookies in api return value.
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
    entities: [],
    data: {
      currentUserId: userId,
      authToken: headerJwt,
    },
  };
}

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
    dataSchema,
  },
  async function registerUserApi({
    email,
    password,
    name,
    birthday,
  }: ApiHandlerParams<'registerUser'>, res) {
    const invalidBirthdayReason = getBirthdayInvalidReason(birthday);
    if (invalidBirthdayReason) {
      throw new UserFacingError(invalidBirthdayReason, 400);
    }

    const invalidPasswordReason = getPasswordInvalidReason(password);
    if (invalidPasswordReason) {
      throw new UserFacingError(invalidPasswordReason, 400);
    }

    name = name.trim();
    // todo: mid/mid validate obvious non-names
    const nameInvalidReason = getNameInvalidReason(name);
    if (nameInvalidReason) {
      throw new UserFacingError(nameInvalidReason, 400);
    }

    let userId: EntityId;
    try {
      const user = await knexBT.transaction(async trx => {
        const inserted = await User.insert({
          email: email.toLowerCase(),
          name,
          birthday,
        }, { trx });
        await UserAuth.insert({
          userId: inserted.id,
          password: await getPasswordHash(password),
        }, { trx });
        return inserted;
      });
      await waitForUserInsert(
        user.id,
        {
          throwIfTimeout: true,
          timeoutErrMsg: 'Timed out while creating account, please try again or try logging in later.',
        },
      );
      userId = user.id;
    } catch (err) {
      if (err instanceof UniqueViolationError
        && (err.constraint === 'email' || err.constraint === User.cols.email)) {
        throw new UserFacingError('That email address is already taken, please try a different one.', 400);
      }
      if (err instanceof Error && err.message.includes('timed out')) {
        throw new UserFacingError(
          'Timed out while creating user',
          503,
          { ...(err instanceof Error && err.debugCtx), origErr: err },
        );
      }
      throw err;
    }

    return _sendAuthToken(userId, res);
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
    dataSchema,
  },
  async function loginUserApi({ email, password }: ApiHandlerParams<'loginUser'>, res) {
    const user = await User.selectOne({ email: email.toLowerCase() });
    if (!user) {
      throw new UserFacingError('Email or password is incorrect.', 400);
    }
    const userAuth = await UserAuth.selectOne({ userId: user.id });
    if (!userAuth || !await isPasswordValid(userAuth.password, password)) {
      throw new UserFacingError('Email or password is incorrect.', 400);
    }

    return _sendAuthToken(user.id, res);
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
    const user = await User.selectOne({ email: email.toLowerCase() });
    if (!user) {
      throw new UserFacingError('Can\'t find an account with that email.', 400);
    }

    const randToken = await new Promise<string>((succ, fail) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          fail(err);
        } else {
          succ(buf.toString('hex'));
        }
      });
    });

    const hash = crypto.createHash('sha256').update(randToken).digest('base64');
    // todo: low/easy use UserAuth instead of UserMeta
    await UserMeta.delete({
      userId: user.id,
      metaKey: RESET_PASSWORD_HASH,
    });
    await UserMeta.insert({
      userId: user.id,
      metaKey: RESET_PASSWORD_HASH,
      metaValue: JSON.stringify({
        hash,
        expires: Date.now() + (60 * 60 * 1000),
      }),
    });

    try {
      await sendEmail(
        email,
        `[${APP_NAME}] Reset Password`,
        `
        <p>Hi ${user.name},</p>
        <p>Someone requested a password reset for your account. To reset your password, please visit the following link. This link will expire in 1 hour.</p>
        <p><a href="${HOME_URL}/resetpasswordverify?userId=${user.id}&token=${randToken}">${HOME_URL}/resetpasswordverify?userId=${user.id}&token=${randToken}</a></p>
        <p>If you didn't make this request, you can ignore this email.</p>
        <p>${APP_NAME}</p>
        `,
      );
    } catch (err) {
      throw new UserFacingError(
        'Failed to send email',
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
      required: ['userId', 'token', 'password'],
      properties: {
        userId: SchemaConstants.id,
        token: { type: 'string', minLength: 32, maxLength: 44 },
        password: SchemaConstants.password,
      },
      additionalProperties: false,
    },
    dataSchema,
  },
  async function verifyResetPasswordApi({
    userId,
    token,
    password,
  }: ApiHandlerParams<'verifyResetPassword'>, res) {
    if (!userId) {
      throw new UserFacingError('Invalid user.', 400);
    }
    if (!token) {
      throw new UserFacingError('Invalid token', 400);
    }

    const userAuth = await UserAuth.selectOne({ userId });
    if (!userAuth) {
      throw new UserFacingError('Invalid user.', 400);
    }

    let data;
    try {
      // todo: mid/mid add skip cache option to entloader
      const row = await modelQuery(UserMeta)
        .select(UserMeta.cols.metaValue)
        .findOne({
          [UserMeta.cols.userId]: userAuth.userId,
          [UserMeta.cols.metaKey]: RESET_PASSWORD_HASH,
        });
      if (row?.metaValue) {
        data = JSON.parse(row.metaValue);
      }
    } catch {}
    if (!data || !data.expires || data.expires < Date.now()) {
      throw new UserFacingError('Password reset request has expired.', 400);
    }

    const submittedHash = crypto.createHash('sha256')
      .update(token)
      .digest('base64');
    if (submittedHash !== data.hash) {
      throw new UserFacingError('Invalid token', 400);
    }

    await UserAuth.update(
      { userId: userAuth.userId },
      { password: await getPasswordHash(password) },
    );
    await UserMeta.delete({
      userId: userAuth.userId,
      metaKey: 'resetPassword',
    });

    return _sendAuthToken(userAuth.userId, res);
  },
);

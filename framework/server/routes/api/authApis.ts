import crypto from 'crypto';
import { UniqueViolationError } from 'db-errors';

import { defineApi } from 'services/ApiManager';
import sendEmail from 'services/sendEmail';
import { RESET_PASSWORD_HASH } from 'consts/coreUserMetaKeys';
import { APP_NAME, HOME_URL, DOMAIN_NAME } from 'settings';
import { DEFAULT_AUTH_EXPIRATION } from 'serverSettings';
import { getBirthdayInvalidReason, getNameInvalidReason, getPasswordInvalidReason } from 'helpers/users/validateUser';
import { getCookieJwt, getHeaderJwt } from 'helpers/auth/jwt';
import { getPasswordHash, isPasswordValid } from 'helpers/auth/passwords';

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
    maxAge: DEFAULT_AUTH_EXPIRATION,
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
      throw new HandledError(invalidBirthdayReason, 400);
    }

    const invalidPasswordReason = getPasswordInvalidReason(password);
    if (invalidPasswordReason) {
      throw new HandledError(invalidPasswordReason, 400);
    }

    name = name.trim();
    const nameInvalidReason = getNameInvalidReason(name);
    if (nameInvalidReason) {
      throw new HandledError(nameInvalidReason, 400);
    }

    let userId: EntityId;
    try {
      const user = await User.insert({
        email: email.toLowerCase(),
        password: await getPasswordHash(password),
        name,
        birthday,
      });
      userId = user.id;
    } catch (err) {
      if (err instanceof UniqueViolationError
        && (err.constraint === 'email' || err.constraint === User.cols.email)) {
        throw new HandledError('That email address is already taken, please try a different one.', 400);
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
    if (!email || !password) {
      throw new HandledError('Email or password is incorrect.', 400);
    }

    const user = await User.selectOne({ email: email.toLowerCase() });
    if (!user || !await isPasswordValid(user.password, password)) {
      throw new HandledError('Email or password is incorrect.', 400);
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
    if (!email) {
      throw new HandledError('Email or password is incorrect.', 400);
    }

    const user = await User.selectOne({ email: email.toLowerCase() });
    if (!user) {
      throw new HandledError('Can\'t find email.', 400);
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
    // todo: mid/mid use redis instead of UserMeta
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
        <p>You requested a password reset. Please visit this link to enter your new password. This link will expire in 1 hour.</p>
        <p><a href="${HOME_URL}/resetpasswordverify?userId=${user.id}&token=${randToken}">${HOME_URL}/resetpasswordverify?userId=${user.id}&token=${randToken}</a></p>
        <p>If you did not make this request, you can ignore this email.</p>
        <p>${APP_NAME}</p>
        `,
      );
    } catch (err) {
      throw new HandledError('Sending email failed', 500, err);
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
      throw new HandledError('Invalid user.', 400);
    }
    if (!token) {
      throw new HandledError('Invalid token', 400);
    }

    const user = await User.selectOne({ id: userId });
    if (!user) {
      throw new HandledError('Invalid user.', 400);
    }

    let data;
    try {
      // todo: mid/mid add skip cache option to entloader
      const row = await modelQuery(UserMeta)
        .select(UserMeta.cols.metaValue)
        .findOne({
          [UserMeta.cols.userId]: user.id,
          [UserMeta.cols.metaKey]: RESET_PASSWORD_HASH,
        });
      if (row?.metaValue) {
        data = JSON.parse(row.metaValue);
      }
    } catch {}
    if (!data || !data.expires || data.expires < Date.now()) {
      throw new HandledError('Password reset request has expired.', 400);
    }

    const submittedHash = crypto.createHash('sha256')
      .update(token)
      .digest('base64');
    if (submittedHash !== data.hash) {
      throw new HandledError('Invalid token', 400);
    }

    await User.update(
      { id: user.id },
      { password: await getPasswordHash(password) },
    );
    await UserMeta.delete({
      userId: user.id,
      metaKey: 'resetPassword',
    });

    return _sendAuthToken(user.id, res);
  },
);

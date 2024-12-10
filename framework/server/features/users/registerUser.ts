import dayjs from 'dayjs';
import { UniqueViolationError } from 'db-errors';

import {
  MIN_USER_AGE,
  MAX_USER_AGE,
  MIN_USER_NAME_LENGTH,
  MAX_USER_NAME_LENGTH,
  USER_NAME_REGEX,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  DELETED_USER_EMAIL_DOMAIN,
} from 'consts/coreUsers';
import isNameForbidden from 'utils/isNameForbidden';
import isNameUnsafe from 'utils/isNameUnsafe';
// Top 500 from
// https://github.com/danielmiessler/SecLists/blob/master/Passwords/Common-Credentials/10k-most-common.txt
import commonPasswordsRaw from 'consts/commonPasswords.txt';
// From
// https://github.com/disposable-email-domains/disposable-email-domains
import disposableEmailDomainsRaw from 'consts/disposableEmailDomains.txt';
import formatTitle from 'utils/formatTitle';
import { getPasswordHash } from 'features/users/userPasswords';
import { waitForUserInsert, afterRegisterUser } from 'config/functions';
import knexBT from 'services/knex/knexBT';
import getUserByEmailPassword from 'features/users/getUserByEmailPassword';
import tokenizeString from 'utils/nlp/tokenizeString';
import consumeRateLimit from 'services/redis/consumeRateLimit';
import { APP_NAME_LOWER } from 'config/config';

const commonPasswords = new Set(commonPasswordsRaw.trim().split('\n'));

const disposableEmailDomains = new Set(disposableEmailDomainsRaw.trim().split('\n'));

const forbiddenNameWords = new Set([
  'you',
  'null',
  'undefined',
  'true',
  'false',
  'admin',
  'root',
  'superuser',
  'noone',
  'nobody',
  'someone',
  'everyone',
  'anonymous',
]);

const forbiddenNamePhrases = [
  'no one',
  'test user',
  'test account',
  'unknown user',
  'unknown account',
  'click here',
  'click me',
  'support team',
  APP_NAME_LOWER,
];

export function getBirthdayInvalidReason(birthday: string): string | null {
  const diffYears = dayjs().diff(birthday, 'year', true);
  if (diffYears < MIN_USER_AGE) {
    return `You must be at least ${MIN_USER_AGE} to join.`;
  }
  if (diffYears > MAX_USER_AGE) {
    return 'Invalid age.';
  }

  return null;
}

// todo: low/easy maybe use llm to validate name
export function getNameInvalidReason(name: string): string | null {
  if (name.length < MIN_USER_NAME_LENGTH) {
    return 'Name too short.';
  }
  if (name.length > MAX_USER_NAME_LENGTH) {
    return 'Name too long.';
  }
  if (!USER_NAME_REGEX.test(name)) {
    return 'Name contains invalid characters.';
  }
  const lowerName = name.toLowerCase();
  if (isNameForbidden(lowerName) || isNameUnsafe(lowerName)) {
    return 'Name isn\'t allowed.';
  }

  for (const phrase of forbiddenNamePhrases) {
    if (lowerName.includes(phrase)) {
      return 'Name isn\'t allowed.';
    }
  }

  const words = tokenizeString(name);
  for (const w of words) {
    if (forbiddenNameWords.has(w)) {
      return 'Name isn\'t allowed.';
    }
  }

  return null;
}

export function getEmailInvalidReason(email: string): string | null {
  const domain = email.split('@')[1];
  const domainParts = domain?.split('.');
  if (!domainParts || domainParts.length < 2 || domain === DELETED_USER_EMAIL_DOMAIN) {
    return 'Invalid email.';
  }

  const rootDomain = domainParts.slice(-2).join('.');
  if (disposableEmailDomains.has(rootDomain)) {
    return 'Email not allowed.';
  }

  return null;
}

export function getPasswordInvalidReason(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return 'Password too short';
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return 'Password too long.';
  }
  if (commonPasswords.has(password)) {
    return 'Password is in the most common 500 passwords.';
  }
  return null;
}

export async function registerUser({
  email,
  password,
  name,
  birthday,
  is3rdPartyAuth,
  isEmailVerified,
}: {
  email: string,
  password: string | null,
  name: string,
  birthday: string | null,
  is3rdPartyAuth?: boolean,
  isEmailVerified?: boolean,
}) {
  const ip = getRC()?.ip;
  if (!ip) {
    throw new UserFacingError('Unable to register at the moment', {
      status: 500,
      debugCtx: { reason: 'IP null' },
    });
  }

  if (birthday) {
    const invalidBirthdayReason = getBirthdayInvalidReason(birthday);
    if (invalidBirthdayReason) {
      throw new UserFacingError(invalidBirthdayReason, 400);
    }
  }

  email = email.toLowerCase();
  const emailInvalidReason = getEmailInvalidReason(email);
  if (emailInvalidReason) {
    throw new UserFacingError(emailInvalidReason, 400);
  }

  if (password) {
    const invalidPasswordReason = getPasswordInvalidReason(password);
    if (invalidPasswordReason) {
      throw new UserFacingError(invalidPasswordReason, 400);
    }
  }

  name = formatTitle(name);
  // todo: low/mid validate obvious non-names
  const nameInvalidReason = getNameInvalidReason(name);
  if (nameInvalidReason) {
    throw new UserFacingError(nameInvalidReason, 400);
  }

  await consumeRateLimit({
    type: 'registerUser',
    errMsg: 'Created too many accounts from your IP.',
    key: ip,
  });

  let user: UserModel;
  let isExisting = false;
  try {
    user = await knexBT.transaction(async trx => {
      const newUser = await UserModel.insertOne({
        email: email.toLowerCase(),
        name,
        birthday,
      }, {
        trx,
        onDuplicate: 'error',
      });

      await UserAuthModel.insertOne(
        {
          userId: newUser.id,
          password: password
            ? await getPasswordHash(password)
            : null,
          ...(isEmailVerified ? { isEmailVerified } : null),
        } as { userId: number, password: string | null, isEmailVerified: boolean }
          | { userId: number, password: string | null },
        {
          trx,
          onDuplicate: 'update',
        },
      );

      return newUser;
    });
  } catch (err) {
    if (!(err instanceof UniqueViolationError)
      || (!err.constraint.includes('email')
        && !err.columns.includes('email'))) {
      throw err;
    }

    let user2: UserModel | null = null;
    if (is3rdPartyAuth) {
      user2 = await UserModel.selectOne({ email: email.toLowerCase() });
    } else if (password) {
      const result = await getUserByEmailPassword(email, password);
      if (result.isCorrect) {
        user2 = result.user;
      }
    }

    if (!user2) {
      throw new UserFacingError(
        'That email address is already taken, please try logging in.',
        400,
      );
    }

    const userAuth = await UserAuthModel.selectOne({ userId: user2.id });
    if (is3rdPartyAuth && password && userAuth && !userAuth.password) {
      await UserAuthModel.updateOne(
        { userId: user2.id },
        { password: await getPasswordHash(password) },
      );
    } else if (!is3rdPartyAuth
      // Don't throw if user just signed up, they might be retrying signup form.
      && (!userAuth || Date.now() - userAuth.registerTime.getTime() > 60 * 60 * 1000)) {
      throw new UserFacingError(
        'That email address is already taken, please try logging in.',
        400,
      );
    }

    user = user2;
    isExisting = true;
  }

  if (!isExisting) {
    await Promise.all([
      afterRegisterUser(user.id),
      UnsubEmailModel.deleteOne({ email }),
    ]);
  }

  await waitForUserInsert(
    user.id,
    { timeout: 2000 },
  );
  return { user, isExisting };
}

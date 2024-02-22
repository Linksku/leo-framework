import dayjs from 'dayjs';
import { UniqueViolationError } from 'db-errors';

import {
  MIN_USER_AGE,
  MAX_USER_AGE,
  MIN_USER_NAME_LENGTH,
  MAX_USER_NAME_LENGTH,
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
import { getPasswordHash } from 'api/helpers/auth/passwords';
import { waitForUserInsert } from 'config/functions';
import knexBT from 'services/knex/knexBT';
import getUserByEmailPassword from './getUserByEmailPassword';

const commonPasswords = new Set(commonPasswordsRaw.trim().split('\n'));

const disposableEmailDomains = new Set(disposableEmailDomainsRaw.trim().split('\n'));

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

export function getNameInvalidReason(name: string): string | null {
  if (name.length < MIN_USER_NAME_LENGTH) {
    return 'Name too short.';
  }
  if (name.length > MAX_USER_NAME_LENGTH) {
    return 'Name too long.';
  }
  if (/[!"#$%&()*/:;=^_`{}~<>]/.test(name)) {
    return 'Name contains invalid characters.';
  }
  if (isNameForbidden(name) || isNameUnsafe(name)) {
    return 'Name isn\'t allowed.';
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
  if (birthday) {
    const invalidBirthdayReason = getBirthdayInvalidReason(birthday);
    if (invalidBirthdayReason) {
      throw new UserFacingError(invalidBirthdayReason, 400);
    }
  }

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

  let isExisting = false;
  const user = await knexBT.transaction(async trx => {
    let newUser: UserModel;
    try {
      newUser = await UserModel.insertOne({
        email: email.toLowerCase(),
        name,
        birthday,
      }, {
        trx,
        onDuplicate: 'error',
      });
    } catch (err) {
      if (!(err instanceof UniqueViolationError)
        || (err.constraint !== 'email'
          && err.constraint !== UserModel.cols.email
          && !err.columns.includes('email'))) {
        throw err;
      }

      let user2: UserModel | null = null;
      if (is3rdPartyAuth) {
        user2 = await UserModel.selectOne({ email: email.toLowerCase() });
      } else if (password) {
        // Don't throw if user just signed up, they might be retrying signup form.
        user2 = await getUserByEmailPassword(email, password);
      }

      if (!user2) {
        throw new UserFacingError(
          'That email address is already taken, please try logging in.',
          400,
        );
      }

      if (!is3rdPartyAuth) {
        const userAuth = await UserAuthModel.selectOne({ userId: user2.id });
        if (!userAuth || Date.now() - userAuth.registerTime.getTime() > 60 * 60 * 1000) {
          throw new UserFacingError(
            'That email address is already taken, please try logging in.',
            400,
          );
        }
      }

      newUser = user2;
      isExisting = true;
    }

    if (!isExisting || password) {
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
    }
    return newUser;
  });

  await waitForUserInsert(
    user.id,
    { timeout: 2000 },
  );
  return { user, isExisting };
}

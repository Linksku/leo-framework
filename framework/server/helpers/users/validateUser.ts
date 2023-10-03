import dayjs from 'dayjs';

import {
  MIN_USER_AGE,
  MAX_USER_AGE,
  MIN_USER_NAME_LENGTH,
  MAX_USER_NAME_LENGTH,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
} from 'consts/coreUsers';
import isNameUnsafe from 'helpers/isNameUnsafe';
// Top 500 from
// https://github.com/danielmiessler/SecLists/blob/master/Passwords/Common-Credentials/10k-most-common.txt
import commonPasswordsRaw from 'consts/commonPasswords.txt';
// From
// https://github.com/disposable-email-domains/disposable-email-domains
import disposableEmailDomainsRaw from 'consts/disposableEmailDomains.txt';

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
  if (/[!"#$%&()*/:;=^_`{}~]/.test(name)) {
    return 'Name contains invalid characters.';
  }
  if (isNameUnsafe(name)) {
    return 'Name isn\'t allowed.';
  }

  return null;
}

export function getEmailInvalidReason(email: string): string | null {
  const domain = email.split('@')[1];
  const domainParts = domain?.split('.');
  if (!domainParts || domainParts.length < 2) {
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

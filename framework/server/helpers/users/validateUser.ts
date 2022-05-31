import dayjs from 'dayjs';

import {
  MIN_USER_AGE,
  MAX_USER_AGE,
  MIN_USER_NAME_LENGTH,
  MAX_USER_NAME_LENGTH,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
} from 'consts/coreUsers';
import tokenizeString from 'utils/nlp/tokenizeString';
import isNameInappropriate from 'helpers/isNameInappropriate';

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
  const words = tokenizeString(name);
  if (isNameInappropriate(words)) {
    return 'Name isn\'t allowed.';
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
  // todo: mid/mid disallow more common passwords
  if (['12345678', 'password', 'qwertyui'].includes(password)) {
    return 'Password is too common.';
  }
  return null;
}

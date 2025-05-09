export const USER_ROLES = {
  USER: 0,
  EMPLOYEE: 32,
  ENGINEER: 64,
  ADMIN: 128,
};

export const MIN_USER_NAME_LENGTH = 3;

export const MAX_USER_NAME_LENGTH = 31;

export const USER_NAME_REGEX = /^[\w \-'\u0080-\uFFFF]+$/;

export const MENTION_USER_NAME_REGEX = /@[\w \-'\u0080-\uFFFF]+:\d+\b/g;

// 13 for US, 16 for some EU
export const MIN_USER_AGE = 13;

export const MIN_ADULT_USER_AGE = 18;

export const MAX_USER_AGE = 150;

export const MIN_PASSWORD_LENGTH = 8;

export const MAX_PASSWORD_LENGTH = 255;

export const DELETED_USER_EMAIL_DOMAIN = 'deleted.invalid';

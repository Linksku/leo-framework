import { HOME_URL } from './server';

// Port needed for dev
export const HTTP_URL_REGEX = /^https?:\/\/(?:[\w\u00A1-\uFFFF-]{0,63}\.)*[a-z\u00A1-\uFFFF]{2,}(?::\d+)?(?:[#/?](?:\S*[^\s!.?])?)?/i;

if (!process.env.PRODUCTION && !HTTP_URL_REGEX.test(HOME_URL)) {
  throw new Error('HTTP_URL_REGEX must match HOME_URL');
}

export const ABSOLUTE_URL_REGEX = /^(?:[a-z][a-z-_]+:\/\/|mailto:)/i;

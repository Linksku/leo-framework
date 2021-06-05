const PROD_SERVER = process.env.SERVER === 'production';

export const USE_SECURE_COOKIES = PROD_SERVER;
export const DEFAULT_AUTH_EXPIRATION = 30 * 24 * 60 * 60 * 1000;
// eslint-disable-next-line prefer-destructuring
export const NOREPLY_EMAIL = process.env.NOREPLY_EMAIL;

export const OBJECT_CACHE_TIMEOUT = 5 * 60 * 1000;

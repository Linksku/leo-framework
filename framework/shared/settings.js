if (!process.env.APP_NAME || !process.env.PORT || !process.env.DOMAIN_NAME) {
  throw new Error('Env vars not set.');
}

// Don't export these because Webpack can't optimize.
const PROD_BUILD = process.env.PRODUCTION;
const PROD_SERVER = process.env.SERVER === 'production';

// eslint-disable-next-line prefer-destructuring
export const APP_NAME = process.env.APP_NAME;
// eslint-disable-next-line prefer-destructuring
export const APP_NAME_LOWER = process.env.APP_NAME_LOWER;
export const SITE_TITLE = process.env.APP_NAME;
export const PROTOCOL = `http${PROD_SERVER ? 's' : ''}://`;
export const DOMAIN_NAME = PROD_SERVER ? process.env.DOMAIN_NAME : 'localhost';
export const PORT = PROD_SERVER ? 80 : Number.parseInt(process.env.PORT, 10);
// eslint-disable-next-line prefer-destructuring
export const BASE_PATH = process.env.BASE_PATH;
export const HOME_URL = PORT === 80
  ? `${PROTOCOL}${DOMAIN_NAME}`
  : `${PROTOCOL}${DOMAIN_NAME}:${PORT}`;
export const ASSETS_URL = PROD_SERVER ? `${PROTOCOL}assets.${DOMAIN_NAME}` : '';
export const API_URL = PROD_SERVER ? `${PROTOCOL}api.${DOMAIN_NAME}` : '';
export const HTTP_TIMEOUT = PROD_BUILD ? 5000 : 15 * 1000;
export const MAX_HTTP_TIMEOUT = 30 * 1000;
export const NOREPLY_EMAIL = `noreply@${process.env.DOMAIN_NAME}`;
export const SUPPORT_EMAIL = `support@${process.env.DOMAIN_NAME}`;

if (!process.env.APP_NAME || !process.env.PORT || !process.env.DOMAIN_NAME) {
  throw new Error('Env vars not set.');
}

// Don't export these because Webpack can't optimize.
const PROD_BUILD = process.env.NODE_ENV === 'production';
const PROD_SERVER = process.env.SERVER === 'production';

const PORT = PROD_SERVER ? 80 : Number.parseInt(process.env.PORT, 10);
// eslint-disable-next-line prefer-destructuring
const DOMAIN_NAME = PROD_SERVER ? process.env.DOMAIN_NAME : 'localhost';

const PROTOCOL = `http${PROD_SERVER ? 's' : ''}://`;

const DEBUG = false;

module.exports = {
  APP_NAME: process.env.APP_NAME,
  SITE_TITLE: process.env.APP_NAME,
  PROTOCOL,
  DOMAIN_NAME,
  PORT,
  BASE_PATH: process.env.BASE_PATH,
  HOME_URL: PORT === 80
    ? `${PROTOCOL}${DOMAIN_NAME}`
    : `${PROTOCOL}${DOMAIN_NAME}:${PORT}`,
  ASSETS_URL: PROD_SERVER ? `${PROTOCOL}assets.${DOMAIN_NAME}` : '',
  API_URL: PROD_SERVER ? `${PROTOCOL}api.${DOMAIN_NAME}` : '',
  HTTP_TIMEOUT: PROD_BUILD ? 5000 : 15_000,
  MAX_HTTP_TIMEOUT: 30_000,
  NOREPLY_EMAIL: `noreply@${process.env.DOMAIN_NAME}`,
  SUPPORT_EMAIL: `support@${process.env.DOMAIN_NAME}`,
  DEBUG: DEBUG && process.env.NODE_ENV !== 'production',
};

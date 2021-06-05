if (!process.env.APP_NAME || !process.env.DOMAIN_NAME) {
  throw new Error('Env vars not set.');
}

// Don't export these because Webpack can't optimize.
const PROD_BUILD = process.env.NODE_ENV === 'production';
const PROD_SERVER = process.env.SERVER === 'production';

const USE_SSL = !!process.env.USE_SSL && process.env.USE_SSL !== '0';
const PORT = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 80;
// eslint-disable-next-line prefer-destructuring
const DOMAIN_NAME = process.env.DOMAIN_NAME;

const protocol = `http${USE_SSL ? 's' : ''}://`;

module.exports = {
  APP_NAME: process.env.APP_NAME,
  SITE_TITLE: process.env.APP_NAME,
  USE_SSL,
  DOMAIN_NAME,
  PORT,
  BASE_PATH: process.env.BASE_PATH,
  HOME_URL: PORT === 80
    ? `${protocol}${DOMAIN_NAME}`
    : `${protocol}${DOMAIN_NAME}:${PORT}`,
  ASSETS_URL: PROD_SERVER ? `${protocol}assets.${DOMAIN_NAME}` : '',
  HTTP_TIMEOUT: PROD_BUILD ? 5000 : 60_000,
};

import { PROD_DOMAIN_NAME } from '../../../app/shared/config/config.js';

// Don't export these because Webpack can't optimize.
// const PROD_BUILD = process.env.PRODUCTION;
const PROD_SERVER = process.env.SERVER === 'production';

export const PROTOCOL = `http${PROD_SERVER ? 's' : ''}://`;
export const DOMAIN_NAME = PROD_SERVER ? PROD_DOMAIN_NAME : 'localhost';
export const PORT = PROD_SERVER ? 80 : 9001;
export const BASE_PATH = '';
export const HOME_URL = PORT === 80
  ? PROTOCOL + DOMAIN_NAME
  : `${PROTOCOL}${DOMAIN_NAME}:${PORT}`;
export const ASSETS_URL = PROD_SERVER ? `${PROTOCOL}assets.${DOMAIN_NAME}` : '';
// Separate domain to bypass Cloudflare
export const API_URL = PROD_SERVER ? `${PROTOCOL}api.${DOMAIN_NAME}` : '';
export const API_TIMEOUT = 10 * 1000;
export const API_POST_TIMEOUT = 20 * 1000;
export const DEFAULT_COOKIES_TTL = 90 * 24 * 60 * 60 * 1000;
export const DEFAULT_ASSETS_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

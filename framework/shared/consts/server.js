import {
  PROD_DOMAIN_NAME,
  PROD_SHORT_DOMAIN_NAME,
  NGROK_URL,
} from '../../../app/shared/config/config.js';

// Don't export these because Webpack can't optimize.
// const PROD_BUILD = process.env.PRODUCTION;
const PROD_SERVER = process.env.SERVER === 'production';

export const PROTOCOL = `http${PROD_SERVER ? 's' : ''}://`;
export const DOMAIN_NAME = PROD_SERVER ? PROD_DOMAIN_NAME : 'localhost';
export const SHORT_DOMAIN_NAME = PROD_SERVER ? PROD_SHORT_DOMAIN_NAME : 'localhost';
export const DEV_PORT = 9001;
export const HOME_URL = PROD_SERVER
  ? PROTOCOL + PROD_DOMAIN_NAME
  : (NGROK_URL
    ? ('' + NGROK_URL).replace(/\/$/, '')
    : `${PROTOCOL}localhost:${DEV_PORT}`);
export const SHORT_HOME_URL = PROD_SERVER
  ? PROTOCOL + PROD_SHORT_DOMAIN_NAME
  : HOME_URL;
export const ASSETS_URL = PROD_SERVER
  ? `${PROTOCOL}assets.${PROD_DOMAIN_NAME}`
  : '';
export const ASSETS_URL_ABSOLUTE = PROD_SERVER
  ? ASSETS_URL
  : HOME_URL;
export const API_DOMAIN_NAME = PROD_SERVER
  // Subdomain to bypass Cloudflare
  ? 'api.' + PROD_DOMAIN_NAME
  : 'localhost';
export const API_URL = PROD_SERVER
  ? PROTOCOL + API_DOMAIN_NAME
  : '';
export const DEFAULT_API_TIMEOUT = 10 * 1000;
export const DEFAULT_POST_API_TIMEOUT = 20 * 1000;
export const MAX_API_TIMEOUT = 60 * 1000;
export const STREAM_API_DELIM = ',""␞';
export const DEFAULT_COOKIES_TTL = 90 * 24 * 60 * 60 * 1000;
export const DEFAULT_ASSETS_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

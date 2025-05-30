const path = require('path');
const dotenv = require('dotenv');

process.env.TZ = 'UTC';

dotenv.config({
  path: path.resolve(
    // todo: low/easy move NODE_ENV outside of /env, since it needs to be available before initEnv runs
    // Can't use process.env.PRODUCTION because it might not be set by Webpack
    process.env.NODE_ENV === 'production'
      ? './env/env.prod'
      : './env/env.dev',
  ),
});

dotenv.config({
  path: path.resolve('./env/secrets'),
});

const EXPECTED_ENV_VARS = [
  'PG_BT_USER',
  'PG_BT_PASS',
  'PG_BT_SUPERUSER',
  'MZ_USER',
  'MZ_PASS',
  'PG_RR_USER',
  'PG_RR_PASS',
  'PG_RR_SUPERUSER',
  'REDIS_PASS',
  'MAX_CPU_PERCENT',
  'PASSWORD_PEPPER',
  'JWT_KEY',
  'SSL_KEY',
  'SSL_CERT',
  'AWS_SECRET_KEY',
  'CF_API_KEY',
  'CF_USERNAME',
  'CF_ZONE_ID',
  'DEEPSEEK_SECRET_KEY',
  'DO_SPACES_SECRET',
  'FIREBASE_PRIVATE_KEY',
  'GEMINI_API_KEY',
  'INSTAGRAM_APP_SECRET',
  'MAPBOX_TOKEN',
  'OPENAI_API_KEY',
  'OPENROUTER_API_KEY',
  'PROD_IP',
  'PROD_ROOT_DIR',
];
for (const name of EXPECTED_ENV_VARS) {
  if (process.env[name] === undefined) {
    throw new Error(`Missing environment variable: ${name}`);
  }
}

module.exports = {};

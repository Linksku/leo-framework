const path = require('path');
const dotenv = require('dotenv');

process.env.TZ = 'UTC';

dotenv.config({
  path: path.resolve('./env/env'),
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
  'DEV_PASSWORD_PEPPER',
  'DEV_JWT_KEY',
  'PROD_PASSWORD_PEPPER',
  'PROD_JWT_KEY',
  'DEPLOY_IP',
  'DEPLOY_ROOT_DIR',
  'SSL_KEY',
  'SSL_CERT',
  'AWS_REGION',
  'AWS_BEDROCK_REGION',
  'AWS_ACCESS_ID',
  'AWS_SECRET_KEY',
  'MAPBOX_TOKEN',
  'DO_SPACES_SECRET',
  'CF_ZONE_ID',
  'CF_USERNAME',
  'CF_API_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'INSTAGRAM_APP_SECRET',
];
for (const name of EXPECTED_ENV_VARS) {
  if (process.env[name] === undefined) {
    throw new Error(`Missing environment variable: ${name}`);
  }
}

module.exports = {};

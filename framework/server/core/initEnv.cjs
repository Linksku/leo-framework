const dotenv = require('dotenv');
const path = require('path');

process.env.TZ = 'UTC';

dotenv.config({
  path: path.resolve('./env/env'),
});
dotenv.config({
  path: path.resolve('./env/secrets'),
});

module.exports = {};

const fs = require('fs');
const path = require('path');

const ruleFiles = fs
  .readdirSync('./eslint-local-rules')
  .filter(file => file.endsWith('.cjs') && file !== 'index.cjs');

module.exports = Object.fromEntries(ruleFiles.map(file => [
  path.basename(file, '.cjs'),
  // eslint-disable-next-line import/no-dynamic-require
  require(`./${file}`),
]));

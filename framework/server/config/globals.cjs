const path = require('path');

const readdirRecursiveSync = require('../lib/readdirRecursiveSync.cjs');

const globals = {
  // Node modules.
  dayjs: ['dayjs', 'default'],
  fetch: ['node-fetch', 'default'],
  // Lib.
  EMPTY_ARR: ['./framework/server/lib/emptyArr', 'default'],
  EMPTY_OBJ: ['./framework/server/lib/emptyObj', 'default'],
  ErrorLogger: ['./framework/server/lib/errorLogger/ErrorLogger', 'default'],
  getModelClass: ['./framework/server/lib/Model/getModelClass', 'default'],
  getRC: ['./framework/server/lib/getRequestContext', 'default'],
  HandledError: ['./framework/server/lib/HandledError', 'default'],
  NOOP: ['./framework/server/lib/noop', 'default'],
  printDebug: ['./framework/server/lib/printDebug', 'default'],
  raw: ['./framework/server/services/knex/knexMaterialize', 'raw'],
  SchemaConstants: ['./framework/server/consts/schema', 'default'],
  wrapPromise: ['./framework/server/lib/wrapPromise', 'default'],
};

const filenames = readdirRecursiveSync(path.resolve('./framework/server/models'));
for (const filename of filenames) {
  if (!filename.endsWith('.ts') || filename.endsWith('Mixin.ts')) {
    continue;
  }

  const cls = path.basename(filename).split('.')[0];
  globals[cls] = [`./framework/server/models/${filename.split('.')[0]}`, 'default'];
}
globals.User = [`./framework/server/models/User/User`, 'default'];

module.exports = globals;

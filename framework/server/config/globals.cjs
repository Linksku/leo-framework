const path = require('path');

const { frameworkModels } = require('./__generated__/allModels.cjs');

const globals = {
  // Node modules.
  performance: ['perf_hooks', 'performance'],
  // Lib.
  ErrorLogger: ['./framework/server/services/errorLogger/ErrorLogger', 'default'],
  getModelClass: ['./framework/server/core/models/getModelClass', 'default'],
  getRC: ['./framework/server/core/requestContext/getRequestContext', 'default'],
  NOOP: ['./framework/server/utils/noop', 'default'],
  printDebug: ['./framework/server/utils/printDebug', 'default'],
  entityQuery: ['./framework/server/core/models/entityQuery', 'default'],
  modelQuery: ['./framework/server/core/models/modelQuery', 'default'],
  raw: ['./framework/server/services/knex/knexRR', 'raw'],
  rawSelect: ['./framework/server/utils/db/rawSelect', 'default'],
  SchemaConstants: ['./framework/server/consts/schema', 'default'],
  UserFacingError: ['./framework/server/core/UserFacingError', 'default'],
  wrapPromise: ['./framework/server/utils/wrapPromise', 'default'],
};

for (const model of frameworkModels) {
  if (model.isRR) {
    const cls = path.basename(model.path, '.ts');
    globals[cls] = [`./${model.path.slice(0, -3)}`, 'default'];
  }
}

module.exports = globals;

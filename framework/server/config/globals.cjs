const path = require('path');

const { frameworkModels } = require('./__generated__/allModels.cjs');

const globals = {
  // Node modules.
  performance: ['perf_hooks', 'performance'],
  // Lib.
  EMPTY_ARR: ['./framework/server/utils/emptyArr', 'default'],
  EMPTY_OBJ: ['./framework/server/utils/emptyObj', 'default'],
  ErrorLogger: ['./framework/server/services/errorLogger/ErrorLogger', 'default'],
  getModelClass: ['./framework/server/services/model/getModelClass', 'default'],
  getRC: ['./framework/server/services/requestContext/getRequestContext', 'default'],
  NOOP: ['./framework/server/utils/noop', 'default'],
  printDebug: ['./framework/server/utils/printDebug', 'default'],
  entityQuery: ['./framework/server/services/model/entityQuery', 'default'],
  modelQuery: ['./framework/server/services/model/modelQuery', 'default'],
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

const path = require('path');

const { frameworkModels, appModels } = require('./__generated__/allModels.cjs');

const globals = {};

for (const model of [
  ...frameworkModels,
  ...appModels,
]) {
  if (model.isRR) {
    const cls = path.basename(model.path, '.ts');
    globals[cls] = [`./${model.path.slice(0, -3)}`, 'default'];
  }
}

module.exports = globals;

import path from 'path';

import BaseModel from 'lib/Model/Model';
import modelPaths, { frameworkModelPaths } from './modelPaths';

type ModelsArr = {
  filepath: string;
  Model: ModelClass;
}[];

function filterModels(arr: ModelsArr) {
  const seen: ObjectOf<string> = Object.create(null);
  return arr.filter(({ Model, filepath }) => {
    if (!Model) {
      throw new Error(`models: ${filepath} has no default export`);
    }

    if (!(Model.prototype instanceof BaseModel)) {
      throw new TypeError(`models: ${filepath} isn't a model`);
    }

    if (Model.name !== path.basename(filepath).split('.')[0]) {
      throw new Error(`models: ${Model.name} !== ${filepath.slice(0, filepath.lastIndexOf('.'))}`);
    }

    const prevPath = seen[Model.name];
    if (prevPath) {
      if (prevPath.replace(/^\w+/, '') === filepath.replace(/^\w+/, '')) {
        throw new Error(`models: duplicate model "${Model.name}"`);
      }
      return filepath.startsWith('app/');
    }
    seen[Model.name] = filepath;

    return true;
  });
}

export const frameworkModels: ModelsArr = filterModels(
  frameworkModelPaths
    .map(p => ({
      filepath: p,
      // eslint-disable-next-line import/no-dynamic-require, global-require
      Model: require(`../../../../framework/server/models/${p.slice('framework/server/models/'.length)}`).default,
    })),
);

const models: ModelsArr = filterModels(
  modelPaths
    .map(p => ({
      filepath: p,
      Model: p.startsWith('app/server/models/')
        // server/models needed for Webpack dynamic import
        // eslint-disable-next-line import/no-dynamic-require, global-require
        ? require(`../../../../app/server/models/${p.slice('app/server/models/'.length)}`).default
        // eslint-disable-next-line import/no-dynamic-require, global-require
        : require(`../../../../framework/server/models/${p.slice('framework/server/models/'.length)}`).default,
    })),
);

export default models;

import path from 'path';

import BaseModel from 'services/model/Model';
import readdirRecursive from 'utils/readdirRecursive';

export type ModelsArr = {
  path: string;
  Model: ModelClass;
}[];

function filterModels(models: ModelsArr) {
  const seen: ObjectOf<string> = Object.create(null);
  return models.filter(({ Model, path: filepath }) => {
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

export default async function getAllModels(): Promise<{
  appModels: ModelsArr,
  frameworkModels: ModelsArr,
}> {
  let { appModelPaths, frameworkModelPaths } = await promiseObj({
    appModelPaths: readdirRecursive(path.resolve('./app/server/models')),
    frameworkModelPaths: readdirRecursive(path.resolve('./framework/server/models')),
  });
  appModelPaths = appModelPaths
    .filter(p => p.endsWith('.ts') && !p.endsWith('Mixin.ts'))
    .sort();
  frameworkModelPaths = frameworkModelPaths
    .filter(p => p.endsWith('.ts') && !p.endsWith('Mixin.ts'))
    .sort();

  return {
    appModels: filterModels(appModelPaths
      .map(p => ({
        path: p,
        // "server/models" needed for Webpack dynamic import
        // eslint-disable-next-line import/no-dynamic-require, global-require
        Model: require(`../../../../app/server/models/${p}`).default,
      }))),
    frameworkModels: filterModels(frameworkModelPaths
      .map(p => ({
        path: p,
        // eslint-disable-next-line import/no-dynamic-require, global-require
        Model: require(`../../../../framework/server/models/${p}`).default,
      }))),
  };
}

import { promises as fs } from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';

import getModelsWithPaths, { ModelsArr } from './getModelsWithPaths';

function getOutput({
  frameworkModels,
  appModels,
  forFramework,
  isCjs,
}: {
  frameworkModels: ModelsArr,
  appModels: ModelsArr,
  forFramework: boolean,
  isCjs: boolean,
}) {
  const out = `const frameworkModels${isCjs ? '' : ': any[]'} = [
${frameworkModels.map(model => `  {
    type: '${model.Model.type}',
    path: 'framework/server/models/${model.path}',
    ${isCjs ? '// ' : ''}Model: require('../../${forFramework ? '' : '../../framework/server/'}models/${model.path.slice(0, -3)}').default,
    replicaTable: ${model.Model.getReplicaTable() ? `'${model.Model.getReplicaTable()}'` : 'null'},
  },
`).join('')}];

const appModels${isCjs ? '' : ': any[]'} = [
${appModels.map(model => `  {
    type: '${model.Model.type}',
    path: 'app/server/models/${model.path}',
    ${isCjs ? '// ' : ''}Model: require('../../models/${model.path.slice(0, -3)}').default,
    replicaTable: ${model.Model.getReplicaTable() ? `'${model.Model.getReplicaTable()}'` : 'null'},
  },
`).join('')}];
`;

  return isCjs
    ? `${out}
module.exports = {
  frameworkModels,
  appModels,
};
`
    : `${out}
export { frameworkModels, appModels };
`;
}

export default async function buildModels() {
  const { models: { appModels, frameworkModels } } = await promiseObj({
    models: getModelsWithPaths(),
    framework: mkdirp(path.resolve('./framework/server/config/__generated__')),
    app: mkdirp(path.resolve('./app/server/config/__generated__')),
  });

  await Promise.all([
    fs.writeFile(
      path.resolve('./framework/server/config/__generated__/allModels.ts'),
      getOutput({
        frameworkModels,
        appModels: [],
        forFramework: true,
        isCjs: false,
      }),
    ),
    fs.writeFile(
      path.resolve('./framework/server/config/__generated__/allModels.cjs'),
      getOutput({
        frameworkModels,
        appModels: [],
        forFramework: true,
        isCjs: true,
      }),
    ),
    fs.writeFile(
      path.resolve('./app/server/config/__generated__/allModels.ts'),
      getOutput({
        frameworkModels,
        appModels,
        forFramework: false,
        isCjs: false,
      }),
    ),
    fs.writeFile(
      path.resolve('./app/server/config/__generated__/allModels.cjs'),
      getOutput({
        frameworkModels,
        appModels,
        forFramework: false,
        isCjs: true,
      }),
    ),
  ]);
}

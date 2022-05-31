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
    replicaTable: ${model.Model.getReplicaTable() === null ? 'null' : `'${model.Model.getReplicaTable()}'`},
  },
`).join('')}];

const appModels${isCjs ? '' : ': any[]'} = [
${appModels.map(model => `  {
    type: '${model.Model.type}',
    path: 'app/server/models/${model.path}',
    ${isCjs ? '// ' : ''}Model: require('../../models/${model.path.slice(0, -3)}').default,
    replicaTable: ${model.Model.getReplicaTable() === null ? 'null' : `'${model.Model.getReplicaTable()}'`},
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
  await mkdirp(path.resolve('./app/server/config/__generated__'));
  await fs.writeFile(
    path.resolve('./framework/server/config/__generated__/allModels.ts'),
    `export const frameworkModels = [];

export const appModels = [];
`,
  );
  await mkdirp(path.resolve('./app/server/config/__generated__'));
  await fs.writeFile(
    path.resolve('./app/server/config/__generated__/allModels.ts'),
    `export const frameworkModels = [];

export const appModels = [];
`,
  );

  const { appModels, frameworkModels } = await getModelsWithPaths();

  await fs.writeFile(
    path.resolve('./framework/server/config/__generated__/allModels.ts'),
    getOutput({
      frameworkModels,
      appModels: [],
      forFramework: true,
      isCjs: false,
    }),
  );
  await fs.writeFile(
    path.resolve('./framework/server/config/__generated__/allModels.cjs'),
    getOutput({
      frameworkModels,
      appModels: [],
      forFramework: true,
      isCjs: true,
    }),
  );

  await fs.writeFile(
    path.resolve('./app/server/config/__generated__/allModels.ts'),
    getOutput({
      frameworkModels,
      appModels,
      forFramework: false,
      isCjs: false,
    }),
  );
  await fs.writeFile(
    path.resolve('./app/server/config/__generated__/allModels.cjs'),
    getOutput({
      frameworkModels,
      appModels,
      forFramework: false,
      isCjs: true,
    }),
  );
}

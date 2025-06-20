import { promises as fs } from 'fs';
import path from 'path';
import { mkdirp } from 'mkdirp';

import MaterializedView from 'core/models/MaterializedView';
import getModelsWithPaths, { ModelsArr } from './getModelsWithPaths';

function getOutput({
  frameworkModels,
  appModels,
  hasMVs,
  forFramework,
  isCjs,
}: {
  frameworkModels: ModelsArr,
  appModels: ModelsArr,
  hasMVs: boolean,
  forFramework: boolean,
  isCjs: boolean,
}) {
  frameworkModels = frameworkModels
    .slice()
    .sort((a, b) => a.Model.name.localeCompare(b.Model.name));
  appModels = appModels
    .slice()
    .sort((a, b) => a.Model.name.localeCompare(b.Model.name));

  const out = `const frameworkModels${isCjs ? '' : ': any[]'} = [
${frameworkModels.map(model => `  {
    type: '${model.Model.type}',
    path: 'framework/server/models/${model.path}',
    ${isCjs ? '// ' : ''}Model: require('../../${forFramework ? '' : '../../framework/server/'}models/${model.path.slice(0, -3)}').default,
    isRR: ${model.Model.getReplicaTable() || model.Model.isVirtual || !hasMVs ? 'true' : 'false'},
  },
`).join('')}];

const appModels${isCjs ? '' : ': any[]'} = [
${appModels.map(model => `  {
    type: '${model.Model.type}',
    path: 'app/server/models/${model.path}',
    ${isCjs ? '// ' : ''}Model: require('../../models/${model.path.slice(0, -3)}').default,
    isRR: ${model.Model.getReplicaTable() || model.Model.isVirtual || !hasMVs ? 'true' : 'false'},
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

  if (frameworkModels.some(
    m => m.Model.type !== 'mzTestMV' && TS.extends(m.Model, MaterializedView),
  )) {
    throw new Error('buildModels: MVs shouldn\'t be in framework');
  }

  const hasMVs = appModels.some(
    m => m.Model.type !== 'mzTestMV' && TS.extends(m.Model, MaterializedView),
  );

  await Promise.all([
    fs.writeFile(
      path.resolve('./framework/server/config/__generated__/allModels.ts'),
      getOutput({
        frameworkModels,
        appModels: [],
        hasMVs: false,
        forFramework: true,
        isCjs: false,
      }),
    ),
    fs.writeFile(
      path.resolve('./framework/server/config/__generated__/allModels.cjs'),
      getOutput({
        frameworkModels,
        appModels: [],
        hasMVs: false,
        forFramework: true,
        isCjs: true,
      }),
    ),
    fs.writeFile(
      path.resolve('./framework/server/config/__generated__/consts.ts'),
      `export const HAS_MVS = false;
`,
    ),
    fs.writeFile(
      path.resolve('./app/server/config/__generated__/allModels.ts'),
      getOutput({
        frameworkModels,
        appModels,
        hasMVs,
        forFramework: false,
        isCjs: false,
      }),
    ),
    fs.writeFile(
      path.resolve('./app/server/config/__generated__/allModels.cjs'),
      getOutput({
        frameworkModels,
        appModels,
        hasMVs,
        forFramework: false,
        isCjs: true,
      }),
    ),
    fs.writeFile(
      path.resolve('./app/server/config/__generated__/consts.ts'),
      `export const HAS_MVS = ${hasMVs};
`,
    ),
  ]);
}

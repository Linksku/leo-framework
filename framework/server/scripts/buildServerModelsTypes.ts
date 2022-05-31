import { promises as fs } from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';

import allModels, { ModelsArr, frameworkModels } from 'services/model/allModels';
import Entity from 'services/model/Entity';

function getOutput(models: ModelsArr) {
  return `${
  models
    .filter(m => m.Model.getReplicaTable() === null)
    .map(m => `type ${m.Model.name} = ${m.Model.name}Class['instanceType'];`)
    .join('\n')
}

declare global {
  type EntityType =
    | '${models.filter(m => m.Model.prototype instanceof Entity).map(m => m.Model.type).join(`'
    | '`)}';

${
  models
    .filter(m => m.Model.getReplicaTable() !== null)
    .map(m => `  type ${m.Model.name} = ${m.Model.name}Class['instanceType'];`)
    .join('\n')
}

  // Use ModelTypeToInstance, ModelInstancesMap[ModelType] creates a union of all models
  type ModelInstancesMap = {
${models.map(m => `    ${m.Model.type}: ${m.Model.name};`).join('\n')}
  }

  // Use ModelTypeToClass, ModelClassesMap[ModelType] creates a union of all models
  type ModelClassesMap = {
${models.map(m => `    ${m.Model.type}: ${m.Model.name}Class;`).join('\n')}
  }
}

export {};
`;
}

export default async function buildServerModelsTypes() {
  await mkdirp(path.resolve('./framework/server/types/__generated__'));
  await fs.writeFile(
    path.resolve('./framework/server/types/__generated__/models.d.ts'),
    getOutput(frameworkModels),
  );

  await mkdirp(path.resolve('./app/server/types/__generated__'));
  await fs.writeFile(
    path.resolve('./app/server/types/__generated__/models.d.ts'),
    getOutput(allModels),
  );
}

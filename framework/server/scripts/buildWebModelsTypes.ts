import { promises as fs } from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';

import models, { frameworkModels } from 'lib/Model/models';
import Entity from 'lib/Model/Entity';
import MVCache from 'lib/Model/MVCache';

function getOutput(forFramework: boolean) {
  const filteredModels = forFramework
    ? frameworkModels
    : models;

  return `type EntityType =
  | '${filteredModels.filter(m => m.Model.prototype instanceof Entity || m.Model.prototype instanceof MVCache).map(m => m.Model.type).join(`'
  | '`)}';

${filteredModels.map(m => `type ${m.Model.name} = Entity & I${m.Model.name};`).join('\n')}

// Use EntityTypeToInstance, EntityInstancesMap[ModelType] creates a union of all entities
type EntityInstancesMap = {
${filteredModels.map(m => `  ${m.Model.type}: ${m.Model.name};`).join('\n')}
}
`;
}

export default async function buildWebModelsTypes() {
  await mkdirp(path.resolve('./framework/web/types/generated'));
  await fs.writeFile(
    path.resolve('./framework/web/types/generated/models.d.ts'),
    getOutput(true),
  );

  await mkdirp(path.resolve('./app/web/types/generated'));
  await fs.writeFile(
    path.resolve('./app/web/types/generated/models.d.ts'),
    getOutput(false),
  );
}

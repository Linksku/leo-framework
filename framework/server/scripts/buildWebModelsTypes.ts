import { promises as fs } from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';

import models, { frameworkModels } from 'services/model/allModels';

function getOutput(forFramework: boolean) {
  const filteredModels = forFramework
    ? frameworkModels
    : models;

  return `${filteredModels.map(m => `type ${m.Model.name} = Entity & I${m.Model.name} & {
  relations?: ModelRelationsTypes<'${m.Model.type}'>,
};`).join('\n')}

// Use EntityTypeToInstance, EntityInstancesMap[ModelType] creates a union of all entities
type EntityInstancesMap = {
${filteredModels.map(m => `  ${m.Model.type}: ${m.Model.name};`).join('\n')}
}
`;
}

export default async function buildWebModelsTypes() {
  await mkdirp(path.resolve('./framework/web/types/__generated__'));
  await fs.writeFile(
    path.resolve('./framework/web/types/__generated__/models.d.ts'),
    getOutput(true),
  );

  await mkdirp(path.resolve('./app/web/types/__generated__'));
  await fs.writeFile(
    path.resolve('./app/web/types/__generated__/models.d.ts'),
    getOutput(false),
  );
}

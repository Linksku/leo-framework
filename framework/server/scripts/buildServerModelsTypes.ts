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

  return `${filteredModels.map(
    m => `import type _${m.Model.name} from '${path.relative(
      forFramework ? 'framework/server/types/generated' : 'app/server/types/generated',
      m.filepath.slice(0, m.filepath.lastIndexOf('.')),
    )}';`,
  ).join('\n')}

declare global {
  type EntityType =
    | '${filteredModels.filter(m => m.Model.prototype instanceof Entity).map(m => m.Model.type).join(`'
    | '`)}';

  type CacheType =
    | '${filteredModels.filter(m => m.Model.prototype instanceof MVCache).map(m => m.Model.type).join(`'
    | '`)}';

${filteredModels.map(m => `  type ${m.Model.name}Class = typeof _${m.Model.name};
  type ${m.Model.name} = InstanceType<${m.Model.name}Class>;`).join('\n')}

  // Use ModelTypeToInstance, ModelInstancesMap[ModelType] creates a union of all models
  type ModelInstancesMap = {
${filteredModels.map(m => `    ${m.Model.type}: ${m.Model.name};`).join('\n')}
  }

  // Use ModelTypeToClass, ModelClassesMap[ModelType] creates a union of all models
  type ModelClassesMap = {
${filteredModels.map(m => `    ${m.Model.type}: ${m.Model.name}Class;`).join('\n')}
  }
}
`;
}

export default async function buildServerModelsTypes() {
  await mkdirp(path.resolve('./framework/server/types/generated'));
  await fs.writeFile(
    path.resolve('./framework/server/types/generated/models.d.ts'),
    getOutput(true),
  );

  await mkdirp(path.resolve('./app/server/types/generated'));
  await fs.writeFile(
    path.resolve('./app/server/types/generated/models.d.ts'),
    getOutput(false),
  );
}

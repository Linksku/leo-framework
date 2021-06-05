import { promises as fs } from 'fs';
import path from 'path';
import { Model as _Model } from 'objection';
import mkdirp from 'mkdirp';

import getModels from 'lib/getModels';

// @ts-ignore
global.Model = class Model {};

export default async function buildSharedEntities() {
  const entities = [] as { type: string, name: string }[];

  const models = await getModels();
  for (const model of Object.keys(models)) {
    const EntityModel = models[model];
    const entity = new EntityModel();
    entities.push({ type: EntityModel.type, name: entity.constructor.name });
  }

  await mkdirp(path.resolve('./src/shared/types/generated'));
  await fs.writeFile(
    path.resolve('./src/shared/types/generated/entities.d.ts'),
    `type TypeToEntity = {
${
  entities.map(e => `  ${e.type}: ${e.name},`).join('\n')
}
};
`,
  );
}

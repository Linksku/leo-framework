import { promises as fs } from 'fs';
import path from 'path';
import { Model as _Model } from 'objection';
import mkdirp from 'mkdirp';

import defaultModels from 'models/defaultModels';
import srcModels from 'config/models';

// @ts-ignore
global.Model = class Model {};

function getOutput(models: ObjectOf<EntityModel>) {
  const interfaces = [] as string[];

  for (const model of Object.keys(models)) {
    interfaces.push(`type ${model} = Entity & I${model};
`);
  }

  return interfaces.join('\n');
}

export default async function buildWebEntities() {
  await mkdirp(path.resolve('./web/types/generated'));
  await fs.writeFile(
    path.resolve('./web/types/generated/entities.d.ts'),
    getOutput(defaultModels),
  );

  await mkdirp(path.resolve('./src/web/types/generated'));
  await fs.writeFile(
    path.resolve('./src/web/types/generated/entities.d.ts'),
    getOutput(srcModels),
  );
}

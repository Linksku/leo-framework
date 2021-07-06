import { promises as fs } from 'fs';
import path from 'path';
import { Model as _Model } from 'objection';
import mkdirp from 'mkdirp';

import entityModels from 'lib/entityModels';

// @ts-ignore
global.Model = class Model {};

export default async function buildWebEntities() {
  const interfaces = [] as string[];

  for (const model of Object.keys(entityModels)) {
    interfaces.push(`type ${model} = Entity & I${model};
`);
  }

  await mkdirp(path.resolve('./src/web/types/generated'));
  await fs.writeFile(
    path.resolve('./src/web/types/generated/entities.d.ts'),
    interfaces.join('\n'),
  );
}

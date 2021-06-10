import { promises as fs } from 'fs';
import path from 'path';
import { compile } from 'json-schema-to-typescript';
import { Model as _Model } from 'objection';
import mkdirp from 'mkdirp';

import getModels from 'lib/getModels';

// @ts-ignore
global.Model = class Model {};

export default async function buildWebEntities() {
  const interfaces = [] as string[];

  const models = await getModels();
  for (const model of Object.keys(models)) {
    const EntityModel = models[model];
    const entity = new EntityModel();
    const fields = await compile(EntityModel.jsonSchema, 'Foo', { bannerComment: '' });
    interfaces.push(`interface ${entity.constructor.name} extends Entity {
  type: '${EntityModel.type}';
${
  fields.split('\n').slice(1, -2).join('\n')
    .replace(/\?: /g, ': ')
    .replace(/"/g, '\'')
}
}
`);
  }

  await mkdirp(path.resolve('./src/web/types/generated'));
  await fs.writeFile(
    path.resolve('./src/web/types/generated/entities.d.ts'),
    interfaces.join('\n'),
  );
}

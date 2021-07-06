import type { JSONSchema4 } from 'json-schema';
import { promises as fs } from 'fs';
import path from 'path';
import { Model as _Model } from 'objection';
import mkdirp from 'mkdirp';
import { compile } from 'json-schema-to-typescript';

import entityModels from 'lib/entityModels';
import { isPropDate } from 'models/core/EntityDates';

// @ts-ignore
global.Model = class Model {};

export default async function buildSharedEntities() {
  const entities = [] as { type: string, name: string }[];
  const interfaces = [] as string[];

  for (const model of Object.keys(entityModels)) {
    const EntityModel = entityModels[model];

    for (const [prop, val] of Object.entries(EntityModel.jsonSchema.properties)) {
      if (prop === 'id') {
        continue;
      }
      if (EntityModel.jsonSchema.required.includes(prop)) {
        continue;
      }
      if ((EntityModel.getComputedProperties() as Set<string>).has(prop)) {
        continue;
      }
      if (Array.isArray(val.type) && val.type.includes('null')) {
        continue;
      }
      if (hasOwnProperty(val, 'default')) {
        continue;
      }

      throw new Error(`${model}.${prop} must be auto-incremented (id), required, computed, nullable or have default.`);
    }

    for (const [prop, val] of Object.entries(EntityModel.jsonSchema.properties)) {
      if (isPropDate(EntityModel.jsonSchema, prop)) {
        // @ts-ignore custom prop from json-schema-to-typescript
        val.tsType = 'Date';
      }
    }

    const fields = await compile(
      EntityModel.jsonSchema as JSONSchema4,
      'Foo',
      { bannerComment: '' },
    );
    interfaces.push(`interface I${model} {
  type: '${EntityModel.type}';
  id: number;
${
  fields.split('\n').slice(1, -2).join('\n')
    .replace(/\?: /g, ': ')
    .replace(/"/g, '\'')
}
};
`);
    entities.push({ type: EntityModel.type, name: model });
  }

  await mkdirp(path.resolve('./src/shared/types/generated'));
  await fs.writeFile(
    path.resolve('./src/shared/types/generated/entities.d.ts'),
    `${interfaces.join('\n')}
type TypeToEntity<T extends EntityType> = {
${
  entities.map(e => `  ${e.type}: ${e.name},`).join('\n')
}
}[T];

type EntityType = '${entities.map(e => e.type).join(`' | '`)}';
`,
  );
}

import type { JSONSchemaDefinition } from 'objection';
import type { JSONSchema4 } from 'json-schema';
import { promises as fs } from 'fs';
import path from 'path';
import { Model as _Model } from 'objection';
import mkdirp from 'mkdirp';
import { compile } from 'json-schema-to-typescript';

import entityModels from 'lib/entityModels';

// @ts-ignore
global.Model = class Model {};

function isValidValSchema(val: JSONSchemaDefinition): boolean {
  if (typeof val === 'boolean') {
    return false;
  }
  if (val.anyOf) {
    return val.anyOf.some(v => isValidValSchema(v));
  }
  if (val.allOf) {
    return val.allOf.every(v => isValidValSchema(v));
  }
  if (Array.isArray(val.type) && val.type.includes('null')) {
    return true;
  }
  if (TS.hasProperty(val, 'default')) {
    return true;
  }

  return false;
}

export default async function buildSharedEntities() {
  const entities = [] as { type: string, name: string }[];
  const interfaces = [] as string[];

  for (const [model, EntityModel] of TS.objectEntries(entityModels)) {
    const { allJsonSchema } = EntityModel;
    for (const [prop, val] of Object.entries(allJsonSchema.properties)) {
      if (prop === 'id') {
        continue;
      }
      if (allJsonSchema.required.includes(prop)) {
        continue;
      }
      if ((EntityModel.getComputedProperties() as Set<string>).has(prop)) {
        continue;
      }
      if (isValidValSchema(val)) {
        continue;
      }

      throw new Error(`${model}.${prop} must be auto-incremented (id), required, computed, nullable or have default.`);
    }

    const fields = await compile(
      allJsonSchema as JSONSchema4,
      'Foo',
      { bannerComment: '' },
    );
    interfaces.push(`interface I${model} {
  type: '${EntityModel.type}';
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

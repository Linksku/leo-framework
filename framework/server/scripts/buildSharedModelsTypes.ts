import { promises as fs } from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';
import { compile } from 'json-schema-to-typescript';

import models, { frameworkModels } from 'lib/Model/models';

function isValidValSchema(val: JSONSchema): boolean {
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
  if (TS.hasProp(val, 'default')) {
    return true;
  }

  return false;
}

async function getOutput(forFramework: boolean) {
  const modelClasses = {} as ObjectOf<ModelClass>;
  const modelNames = {} as ObjectOf<string>;
  const interfaces = [] as string[];
  const filteredModels = forFramework ? frameworkModels : models;

  for (const { Model, filepath } of filteredModels) {
    if (forFramework && !filepath.startsWith('framework/')) {
      continue;
    }

    const { schema, jsonSchema } = Model;
    for (const [prop, val] of Object.entries(schema)) {
      if (prop === 'id') {
        continue;
      }
      if (jsonSchema.required.includes(prop)) {
        continue;
      }
      if (isValidValSchema(val)) {
        continue;
      }

      throw new Error(`${Model.name}.${prop} must be auto-incremented (id), required, nullable or have default.`);
    }

    const fields = await compile(
      jsonSchema as JSONSchema,
      'Foo',
      { bannerComment: '' },
    );
    interfaces.push(`interface I${Model.name} {
${
  fields.split('\n').slice(1, -2).join('\n')
    .replace(/\?: /g, ': ')
    .replace(/"/g, '\'')
}
};
`);

    modelClasses[Model.type] = Model;
    modelNames[Model.type] = Model.name;
  }

  return `${interfaces.join('\n')}
type ModelType =
  | '${Object.keys(modelNames).join(`'
  | '`)}';

type ModelInterfacesMap = {
${
  Object.entries(modelNames).map(([type, name]) => `  ${type}: I${name},`).join('\n')
}
};
`;
}

export default async function buildSharedModelsTypes() {
  await mkdirp(path.resolve('./framework/shared/types/generated'));
  await fs.writeFile(
    path.resolve('./framework/shared/types/generated/models.d.ts'),
    await getOutput(true),
  );

  await mkdirp(path.resolve('./app/shared/types/generated'));
  await fs.writeFile(
    path.resolve('./app/shared/types/generated/models.d.ts'),
    await getOutput(false),
  );
}

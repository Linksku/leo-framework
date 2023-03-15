import { promises as fs } from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';
import { compile } from 'json-schema-to-typescript';

import allModels, { ModelsArr, frameworkModels } from 'services/model/allModels';
import isSchemaNullable from 'utils/models/isSchemaNullable';

function isValidValSchema(val: JsonSchema): boolean {
  if (typeof val === 'boolean') {
    return false;
  }
  if (isSchemaNullable(val)) {
    return true;
  }
  if (TS.hasProp(val, 'default')) {
    return true;
  }
  if (val.anyOf) {
    return val.anyOf.some(v => isValidValSchema(v));
  }
  if (val.allOf) {
    return val.allOf.every(v => isValidValSchema(v));
  }

  return false;
}

async function getOutput(models: ModelsArr) {
  const modelClasses = {} as ObjectOf<ModelClass>;
  const modelNames = {} as ObjectOf<string>;
  const interfaces = [] as string[];
  const allRelations = {} as ObjectOf<ObjectOf<{
    Model: ModelClass,
    type: string,
  }>>;

  for (const { Model } of models) {
    for (const [prop, val] of Object.entries(Model.schema)) {
      if (prop === 'id') {
        continue;
      }
      if (Model.jsonSchema.required.includes(prop)) {
        continue;
      }
      if (isValidValSchema(val)) {
        continue;
      }

      throw new Error(`buildSharedModelsTypes.getOutput: ${Model.name}.${prop} must be auto-incremented (id), required, nullable or have default.`);
    }

    const fields = await compile(
      Model.jsonSchema as JsonSchema,
      'Foo',
      { bannerComment: '' },
    );
    interfaces.push(`interface I${Model.name} extends IBaseModel {
${
  fields.split('\n').slice(1, -2).join('\n')
    .replace(/\?: /g, ': ')
    .replace(/"/g, '\'')
}
}
`);

    modelClasses[Model.type] = Model;
    modelNames[Model.type] = Model.name;

    const modelRelations: ObjectOf<{
      Model: ModelClass,
      type: string,
    }> = {};
    for (const [name, relation] of TS.objEntries(Model.relationsMap)) {
      if (relation.relationType === 'hasOne'
        || (relation.relationType === 'belongsToOne' && isSchemaNullable(TS.getProp(Model.schema, relation.fromCol)))) {
        modelRelations[name] = {
          Model: relation.toModel,
          type: `${relation.toModel.name} | null`,
        };
      } else if (relation.relationType === 'belongsToOne') {
        modelRelations[name] = {
          Model: relation.toModel,
          type: `${relation.toModel.name}`,
        };
      } else {
        modelRelations[name] = {
          Model: relation.toModel,
          type: `${relation.toModel.name}[]`,
        };
      }
    }
    allRelations[Model.type] = modelRelations;
  }

  return `${interfaces.join('\n')}
type ModelType =
  | '${Object.keys(modelNames).join(`'
  | '`)}';

type ModelInterfacesMap = {
${
  Object.entries(modelNames).map(([type, name]) => `  ${type}: I${name},
`).join('')
}};

type ModelRelationsMap = {
${
  TS.objEntries(allRelations)
    .map(([type, relations]) => `  ${type}: {
${
  TS.objEntries(relations)
    .map(([name, relation]) => `    ${name}: {
      modelType: '${relation.Model.type}',
      tsType: ${relation.type},
    },
`)
    .join('')
}  },
`)
    .join('')
}};
`;
}

export default async function buildSharedModelsTypes() {
  await mkdirp(path.resolve('./framework/shared/types/__generated__'));
  await fs.writeFile(
    path.resolve('./framework/shared/types/__generated__/models.d.ts'),
    await getOutput(frameworkModels),
  );

  await mkdirp(path.resolve('./app/shared/types/__generated__'));
  await fs.writeFile(
    path.resolve('./app/shared/types/__generated__/models.d.ts'),
    await getOutput(allModels),
  );
}

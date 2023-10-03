import { promises as fs } from 'fs';
import path from 'path';
import { mkdirp } from 'mkdirp';
import { compile } from 'json-schema-to-typescript';

import allModels, { ModelsArr, frameworkModels } from 'services/model/allModels';
import Entity from 'services/model/Entity';
import MaterializedView from 'services/model/MaterializedView';
import InputMaterializedView from 'services/model/InputMaterializedView';
import VirtualModel from 'services/model/VirtualModel';

const ModelBaseClasses = [
  InputMaterializedView,
  MaterializedView,
  Entity,
  VirtualModel,
];

async function getOutput(models: ModelsArr) {
  const localClasses = [] as string[];
  const globalClasses = [] as string[];

  for (const { Model, isRR } of models) {
    const BaseClass = ModelBaseClasses.find(Cls => Model.prototype instanceof Cls);
    if (!BaseClass) {
      throw new Error(`getModelBaseClass: unknown base class for ${Model.name}`);
    }

    const fields = await compile(
      Model.jsonSchema as JsonSchema,
      'Foo',
      { bannerComment: '' },
    );
    const modelStr = `class ${Model.name} extends ${BaseClass.name} implements I${Model.name} {
  declare static type: '${Model.type}';
  declare static Interface: I${Model.name};
  declare static instanceType: ${Model.name};
  declare static schema: ModelSchema<I${Model.name}>;
  declare static cols: ModelColsMap<I${Model.name}>;
  declare static colsQuoted: ModelColsMap<I${Model.name}>;
  declare static primaryIndex: ${
    Array.isArray(Model.primaryIndex)
      ? `['${Model.primaryIndex.join('\', \'')}']`
      : `'${Model.primaryIndex}'`
  };

  declare cls: ${Model.name}Class;
  declare relations?: ModelRelationTypes['${Model.type}'];

${
  fields
    .split('\n')
    .slice(1, -2)
    .map(line => line.trim())
    .map(line => (line.startsWith('/*') || line.startsWith('* ') || line.startsWith('*/')
      ? `  ${line}`
      : `  declare ${line}`))
    .join('\n')
    .replaceAll('?: ', ': ')
    .replaceAll('"', '\'')
}
}

type ${Model.name}Class = typeof ${Model.name};`;
    if (isRR) {
      globalClasses.push(modelStr);
    } else {
      localClasses.push(`declare ${modelStr}`);
    }
  }

  return `import Entity from 'services/model/Entity';
import MaterializedView from 'services/model/MaterializedView';
import InputMaterializedView from 'services/model/InputMaterializedView';
import VirtualModel from 'services/model/VirtualModel';

${localClasses.join('\n\n')}

declare global {
${globalClasses.join('\n\n')}

type EntityType =
  | '${models.filter(m => m.Model.prototype instanceof Entity).map(m => m.Model.type).join(`'
  | '`)}';

// Use ModelTypeToInstance, ModelInstancesMap[ModelType] creates a union of all models
type ModelInstancesMap = {
${models.map(m => `  ${m.Model.type}: ${m.Model.name};`).join('\n')}
};

// Use ModelTypeToClass, ModelClassesMap[ModelType] creates a union of all models
type ModelClassesMap = {
${models.map(m => `  ${m.Model.type}: ${m.Model.name}Class;`).join('\n')}
};
}
`;
}

export default async function buildServerModelsTypes() {
  await mkdirp(path.resolve('./framework/server/types/__generated__'));
  await fs.writeFile(
    path.resolve('./framework/server/types/__generated__/models.d.ts'),
    await getOutput(frameworkModels),
  );

  await mkdirp(path.resolve('./app/server/types/__generated__'));
  await fs.writeFile(
    path.resolve('./app/server/types/__generated__/models.d.ts'),
    await getOutput(allModels),
  );
}

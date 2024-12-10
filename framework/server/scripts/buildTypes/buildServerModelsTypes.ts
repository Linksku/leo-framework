import { promises as fs } from 'fs';
import path from 'path';
import { mkdirp } from 'mkdirp';
import { compile } from 'json-schema-to-typescript';

import allModels, { ModelsArr, frameworkModels } from 'core/models/allModels';
import Entity from 'core/models/Entity';
import MaterializedView from 'core/models/MaterializedView';
import VirtualModel from 'core/models/VirtualModel';

const ModelBaseClasses = [
  MaterializedView,
  Entity,
  VirtualModel,
];

async function getOutput(models: ModelsArr) {
  const localClasses = [] as string[];
  const globalClasses = [] as string[];

  for (const { Model, path: modelPath, isRR } of models) {
    const BaseClass = ModelBaseClasses.find(Cls => Model.prototype instanceof Cls);
    if (!BaseClass) {
      throw new Error(`getModelBaseClass: unknown base class for ${Model.name}`);
    }

    const fields = await compile(
      Model.jsonSchema as JsonSchema,
      'Foo',
      {
        bannerComment: '',
        maxItems: 2,
      },
    );
    const clsName = path.basename(modelPath).split('.')[0];
    const uniqueIndexes = Model.uniqueIndexes.map(
      index => (Array.isArray(index) ? `['${index.join('\', \'')}']` : `'${index}'`),
    );
    const modelStr = `class ${clsName} extends ${BaseClass.name} implements I${Model.name} {
  declare static type: '${Model.type}';
  declare static Interface: I${Model.name};
  declare static instanceType: ${clsName};
  declare static schema: ModelSchema<I${Model.name}>;
  declare static cols: ModelColsMap<'${Model.type}'>;
  declare static colsQuoted: ModelColsMap<'${Model.type}'>;
  declare static primaryIndex: ${
    Array.isArray(Model.primaryIndex)
      ? `['${Model.primaryIndex.join('\', \'')}']`
      : `'${Model.primaryIndex}'`
  };
  declare static uniqueIndexes: ${uniqueIndexes.length ? `[
    ${uniqueIndexes.join(',\n    ')},
  ]` : '[]'};
  declare static requiredCols: ${Model.requiredCols.length ? `['${Model.requiredCols.join('\', \'')}']` : '[]'};

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

type ${Model.name}Class = typeof ${clsName};`;
    if (isRR) {
      globalClasses.push(modelStr);
    } else {
      localClasses.push(`declare ${modelStr}`);
    }
  }

  return `import Entity from 'core/models/Entity';
import MaterializedView from 'core/models/MaterializedView';
import VirtualModel from 'core/models/VirtualModel';

${localClasses.join('\n\n')}

declare global {
${globalClasses.join('\n\n')}

type EntityType =
  | '${models.filter(m => m.Model.prototype instanceof Entity).map(m => m.Model.type).join(`'
  | '`)}';

// Use ModelTypeToInstance, ModelInstancesMap[ModelType] creates a union of all models
type ModelInstancesMap = {
${models.map(m => `  ${m.Model.type}: ${path.basename(m.path).split('.')[0]};`).join('\n')}
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

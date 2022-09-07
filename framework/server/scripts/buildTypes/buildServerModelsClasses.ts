import { promises as fs } from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';
import { compile } from 'json-schema-to-typescript';

import allModels, { ModelsArr, frameworkModels } from 'services/model/allModels';
import Entity from 'services/model/Entity';
import MaterializedView from 'services/model/MaterializedView';
import InputMaterializedView from 'services/model/InputMaterializedView';

const ModelBaseClasses = [
  InputMaterializedView,
  MaterializedView,
  Entity,
];

async function getOutput(models: ModelsArr) {
  const classes = [] as string[];
  for (const { Model } of models) {
    const BaseClass = ModelBaseClasses.find(Cls => Model.prototype instanceof Cls);
    if (!BaseClass) {
      throw new Error(`getModelBaseClass: unknown base class for ${Model.name}`);
    }

    const fields = await compile(
      Model.jsonSchema as JSONSchema,
      'Foo',
      { bannerComment: '' },
    );
    classes.push(`  declare class ${Model.name} extends ${BaseClass.name} implements I${Model.name} {
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
    declare relations?: ModelRelationTypes<'${Model.type}'>;

${
  fields
    .split('\n')
    .slice(1, -2)
    .map(line => `    declare ${line.trim()}`)
    .join('\n')
    .replace(/\?: /g, ': ')
    .replace(/"/g, '\'')
}
  };

  type ${Model.name}Class = typeof ${Model.name};
`);
  }

  return `import Entity from 'services/model/Entity';
import MaterializedView from 'services/model/MaterializedView';
import InputMaterializedView from 'services/model/InputMaterializedView';

declare global {
${classes.join('\n')}
}
`;
}

export default async function buildServerModelsClasses() {
  await mkdirp(path.resolve('./framework/server/types/__generated__'));
  await fs.writeFile(
    path.resolve('./framework/server/types/__generated__/modelClasses.d.ts'),
    await getOutput(frameworkModels),
  );

  await mkdirp(path.resolve('./app/server/types/__generated__'));
  await fs.writeFile(
    path.resolve('./app/server/types/__generated__/modelClasses.d.ts'),
    await getOutput(allModels),
  );
}

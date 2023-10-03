import type { Arguments } from 'yargs';
import dayjs from 'dayjs';
import { promises as fs } from 'fs';
import path from 'path';
import { mkdirp } from 'mkdirp';

import prompt from 'utils/prompt';
import isModelType from 'utils/models/isModelType';
import lcFirst from 'utils/lcFirst';
import getValDbType from 'utils/db/getValDbType';
import exec from 'utils/exec';

function getMigration({
  command,
  modelType,
  columnName,
  isColumnCommand,
}: {
  command: string,
  modelType: string,
  columnName: string,
  isColumnCommand: boolean,
}) {
  if (!command || command === 'none') {
    return {
      imports: [],
      up: '',
      down: '',
    };
  }

  modelType = lcFirst(`${modelType}`);
  if (!isModelType(modelType)) {
    throw new Error('migrateGenerate: unknown model type. Try running build:types');
  }
  const Model = getModelClass(modelType);
  let columnType = '';
  let schema: JsonSchema | null = null;
  if (isColumnCommand) {
    schema = TS.getProp(Model.getSchema(), columnName);
    columnType = schema
      ? getValDbType(Model, columnName as ModelKey<typeof Model>, null)
      : '';
  }

  const createTable = `await createTable({
  isMV: ${Model.isMV},
  table: '${Model.tableName}',
  cb(builder) {

  },
});

await createIndex({
  db: '${Model.isMV ? 'rr' : 'bt'}',
  primary: true,
  table: '${Model.tableName}',
  cols: [''],
});`;
  const dropTable = `await dropTable({
  isMV: ${Model.isMV},
  table: '${Model.tableName}',
});`;
  const alterTable = `await alterTable({
  isMV: ${Model.isMV},
  table: '${Model.tableName}',
  cb(builder) {

  },
});`;
  const renameTable = `await renameTable({
  isMV: ${Model.isMV},
  oldName: '${Model.tableName}',
  newName: '${Model.tableName}',
});`;
  const addColumn = `await addColumn({
  isMV: ${Model.isMV},
  table: '${Model.tableName}',
  col: '${columnName}',
  type: '${columnType}',
  nullable: false,
  default: ${schema?.default ?? ''},
  dropDefault: ${!schema || !TS.hasProp(schema, 'default')},
});`;
  const dropColumn = `await dropColumn({
  isMV: ${Model.isMV},
  table: '${Model.tableName}',
  col: '${columnName}',
});`;
  const renameColumn = `await renameColumn({
  isMV: ${Model.isMV},
  table: '${Model.tableName}',
  oldCol: '${columnName}',
  newCol: '${columnName}',
});`;
  if (command === 'create') {
    return {
      imports: [
        'utils/migrations/createTable',
        'utils/migrations/dropTable',
        'utils/migrations/createIndex',
      ],
      up: createTable,
      down: dropTable,
    };
  }
  if (command === 'drop') {
    return {
      imports: [
        'utils/migrations/dropTable',
        'utils/migrations/createTable',
        'utils/migrations/createIndex',
      ],
      up: dropTable,
      down: createTable,
    };
  }
  if (command === 'alter') {
    return {
      imports: ['utils/migrations/alterTable'],
      up: alterTable,
      down: alterTable,
    };
  }
  if (command === 'rename') {
    return {
      imports: ['utils/migrations/renameTable'],
      up: renameTable,
      down: renameTable,
    };
  }
  if (command === 'addColumn') {
    // todo: low/mid generate columns and indexes from model
    return {
      imports: [
        'utils/migrations/addColumn',
        'utils/migrations/dropColumn',
      ],
      up: addColumn,
      down: dropColumn,
    };
  }
  if (command === 'dropColumn') {
    return {
      imports: [
        'utils/migrations/dropColumn',
        'utils/migrations/addColumn',
      ],
      up: dropColumn,
      down: addColumn,
    };
  }
  if (command === 'renameColumn') {
    return {
      imports: ['utils/migrations/renameColumn'],
      up: renameColumn,
      down: renameColumn,
    };
  }
  throw new Error('getMigrations: invalid command');
}

export default async function migrateGenerate(params: Arguments) {
  let [_, _2, command, modelType, columnName] = params._;

  if (!command) {
    command = await prompt(
      'Command? [none, create, drop, alter, rename, addColumn, dropColumn, renameColumn]',
    );
  }
  const isColumnCommand = ['addColumn', 'dropColumn', 'renameColumn'].includes(command as string);
  if (command && command !== 'none') {
    if (!modelType) {
      modelType = await prompt('Model type?');
    }
    if (isColumnCommand && !columnName) {
      columnName = await prompt('Column name?');
    }
  }
  const { imports, up, down } = getMigration({
    command: `${command}`,
    modelType: `${modelType}`,
    columnName: `${columnName}`,
    isColumnCommand,
  });
  const fileContent = `${imports.map(name => {
    const parts = name.split('/');
    return `import ${parts.at(-1)} from '${name}';`;
  }).join('\n')}

export async function up() {
  ${up.split('\n').join('\n  ')}
}

export async function down() {
  ${down.split('\n').join('\n  ')}
}
`;

  await mkdirp(path.resolve('./app/server/migrations'));
  const fileDescription = command && command !== 'none'
    ? `${command}_${modelType}${isColumnCommand ? `_${columnName}` : ''}`
    : 'custom';
  const filename = `app/server/migrations/${dayjs().format('YYYY-MM-DD_HHmmss')}_${fileDescription}.ts`;
  await fs.writeFile(
    path.resolve(`./${filename}`),
    fileContent,
  );
  printDebug(`Generated ${filename}`, 'success');

  await exec(`code ./${filename}`);
  await exec('yarn build:types');
}

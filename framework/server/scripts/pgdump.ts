import { promises as fs } from 'fs';
import path from 'path';
import childProcess from 'child_process';
import { promisify } from 'util';
import fromPairs from 'lodash/fromPairs';
import trimEnd from 'lodash/trimEnd';

import EntityModels from 'services/model/allEntityModels';
import MaterializedViewModels from 'services/model/allMaterializedViewModels';
import doesPgTypeMatchSchema from 'utils/db/doesPgTypeMatchSchema';
import Entity from 'services/model/Entity';

type Tables = ObjectOf<{
  cols: ObjectOf<string>,
  uniqueIndexes: string[],
  normalIndexes: string[],
}>;

function parseTables(lines: string[]) {
  let hasError = false;
  function printError(str: string) {
    printDebug(str, 'error');
    hasError = true;
  }

  const tables: Tables = Object.create(null);

  // Parse columns
  let curCols: ObjectOf<string> | null = null;
  lines = lines.filter(line => {
    if (!line.trim() || line.startsWith('--') || line.startsWith('SET ')) {
      return false;
    }

    if (curCols && line === ');') {
      curCols = null;
    } else if (curCols) {
      const match = line.match(/^\s*"?(\w+)"? .+/);
      if (!match?.[1]) {
        printError(`Column not found in "${line}"`);
      } else {
        curCols[match[1]] = line.replace(/\s*"?\w+"? (.+?)/, '$1');
        curCols[match[1]] = trimEnd(curCols[match[1]], ',');
      }
    } else if (!curCols && line.startsWith('CREATE TABLE ')) {
      const tableName = line.replace(/CREATE TABLE (?:IF NOT EXISTS )?(?:\w+\.)?"?(\w+)"? \(/, '$1');
      if (tables[tableName]) {
        printError(`Duplicate "${tableName}"`);
      }
      curCols = {};
      tables[tableName] = {
        cols: curCols,
        uniqueIndexes: [],
        normalIndexes: [],
      };
    } else {
      return true;
    }
    return false;
  });

  // Parse constraints
  lines = lines.filter(line => {
    const match = line.match(/^\s*ALTER TABLE (?:ONLY )?(?:\w+\.)?"?(\w+)"? ADD CONSTRAINT "?\w+"? (\w+) KEY \(([^)]+)\)/);
    const table = match && tables[match[1]];
    if (table) {
      if (match[2] === 'PRIMARY') {
        table.uniqueIndexes.unshift(match[3].replaceAll(/"|\s/g, ''));
      } else if (match[2] !== 'FOREIGN') {
        printError(`Unhandled key "${line}"`);
      }
      return false;
    }
    return true;
  });

  // Parse indexes
  lines = lines.filter(line => {
    const match = line.match(/^\s*CREATE (\w+ )?INDEX.+ ON (?:\w+\.)?"?(\w+)"? USING \w+ \((.+?)\)( WHERE .+)?;$/);
    const table = match && tables[match[2]];
    if (table) {
      const cols = match[3].replaceAll(/"|\s/g, '');
      const { uniqueIndexes, normalIndexes } = table;
      if (match[1] === 'UNIQUE ') {
        uniqueIndexes.push(cols);
      } else {
        normalIndexes.push(cols);
      }
      return false;
    }
    return true;
  });

  if (hasError) {
    throw new Error('Had errors');
  }

  delete tables.__test__;
  delete tables.__testMV__;

  console.log(`${lines.length} lines unprocessed.`);
  return tables;
}

function verifyModels(
  tables: Tables,
  models: ModelClass[],
  isBT: boolean,
) {
  let hasError = false;
  function printError(str: string) {
    printDebug(str, 'error');
    hasError = true;
  }

  for (const model of models) {
    if (!tables[model.tableName]) {
      printError(`Missing table "${model.tableName}"`);
    }
  }

  const tableNameToModel = fromPairs(
    models.map(m => [m.tableName, m]),
  );
  for (const [tableName, table] of TS.objEntries(tables)) {
    const Model = tableNameToModel[tableName];
    if (!Model) {
      printError(`Extra table "${tableName}"`);
      continue;
    }

    for (const col of TS.objKeys(table.cols)) {
      if (!TS.hasProp(Model.getSchema(), col)) {
        printError(`Table "${tableName}" has extra "${col}"`);
      }
    }

    for (const [col, schemaType] of Object.entries(Model.getSchema())) {
      const colType = table.cols[col];
      if (!colType) {
        printError(`Table "${tableName}" is missing "${col}"`);
        continue;
      }

      const error = doesPgTypeMatchSchema(col, schemaType, colType);
      if (error) {
        printError(`Column "${tableName}.${col}" ${error}.`);
      }
    }

    const tableIndexesSet = new Set([
      ...table.normalIndexes,
      ...table.uniqueIndexes,
    ]);
    if (tableIndexesSet.size !== table.normalIndexes.length + table.uniqueIndexes.length) {
      printError(`Table "${tableName}" has duplicate index.`);
    }

    if (!isBT) {
      const modelNormalIndexes = new Set([
        ...Model.getNormalIndexes().map(idx => idx.join(',')),
        ...Model.expressionIndexes,
      ]);
      for (const index of modelNormalIndexes) {
        if (!table.normalIndexes.includes(index)) {
          printError(`Table "${tableName}" is missing index "${index}".`);
        }
      }
      for (const index of table.normalIndexes) {
        if (!modelNormalIndexes.has(index)) {
          printError(`Table "${tableName}" has extra index "${index}".`);
        }
      }
    }

    const tmp = !isBT && Model.prototype instanceof Entity
      ? (Model as EntityClass).getUniqueIndexesForRR()
      : Model.getUniqueIndexes();
    const modelUniqueIndexes = new Set(tmp.map(idx => idx.join(',')));
    for (const index of modelUniqueIndexes) {
      if (!table.uniqueIndexes.includes(index)) {
        printError(`Table "${tableName}" is missing unique index "${index}".`);
      }
    }
    for (const index of table.uniqueIndexes) {
      if (!modelUniqueIndexes.has(index)) {
        printError(`Table "${tableName}" has extra unique index "${index}".`);
      }
    }
  }

  if (hasError) {
    throw new Error('Had errors');
  }

  printDebug('Verified tables', 'success');
}

async function dumpDb({
  models,
  host,
  port,
  user,
  pass,
  db,
  schema,
  isBT,
  outFile,
}: {
  models: ModelClass[],
  host: string,
  port: string,
  user: string,
  pass: string,
  db: string,
  schema: string,
  isBT: boolean,
  outFile: string,
}) {
  const out = await promisify(childProcess.exec)(
    `pg_dump --host ${host} --port ${port} --username ${user} --schema-only --format=plain --no-owner --schema ${schema} ${db}`,
    {
      env: {
        PGPASSWORD: pass,
      } as unknown as NodeJS.ProcessEnv,
    },
  );

  if (out.stderr) {
    throw new Error(out.stderr);
  }
  const data = out.stdout;
  if (!data) {
    throw new Error('pgdump failed.');
  }
  const lines = data
    .replaceAll(/\nCREATE SCHEMA /g, '\nCREATE SCHEMA IF NOT EXISTS ')
    // .replaceAll(/\nCREATE TABLE /g, '\nCREATE TABLE IF NOT EXISTS ')
    .replaceAll(/(\n\n\s*ALTER TABLE [^;]+)\s*\n\s*([^;]+;)/g, '$1 $2')
    .split('\n');
  const createSchemaIdx = lines.findIndex(line => line.startsWith('CREATE SCHEMA '));
  lines.splice(createSchemaIdx + 1, 0, `

CREATE EXTENSION postgis SCHEMA "${process.env.PG_RR_SCHEMA}";

CREATE EXTENSION tsm_system_rows SCHEMA "${process.env.PG_RR_SCHEMA}";`);

  const tables = parseTables(lines);

  verifyModels(tables, models, isBT);

  await fs.writeFile(
    path.resolve(`./app/${outFile}.sql`),
    lines.join('\n'),
  );
}

export default async function pgdump() {
  printDebug('Dumping BT', 'info');
  await dumpDb({
    models: EntityModels,
    host: TS.defined(process.env.PG_BT_HOST),
    port: TS.defined(process.env.PG_BT_PORT),
    user: TS.defined(process.env.PG_BT_USER),
    pass: TS.defined(process.env.PG_BT_PASS),
    db: TS.defined(process.env.PG_BT_DB),
    schema: TS.defined(process.env.PG_BT_SCHEMA),
    isBT: true,
    outFile: 'pgdumpBT',
  });

  printDebug('Dumping RR', 'info');
  await dumpDb({
    models: [
      ...EntityModels,
      ...MaterializedViewModels.filter(model => model.getReplicaTable() !== null),
    ],
    host: TS.defined(process.env.PG_RR_HOST),
    port: TS.defined(process.env.PG_RR_PORT),
    user: TS.defined(process.env.PG_RR_USER),
    pass: TS.defined(process.env.PG_RR_PASS),
    db: TS.defined(process.env.PG_RR_DB),
    schema: TS.defined(process.env.PG_RR_SCHEMA),
    isBT: false,
    outFile: 'pgdumpRR',
  });

  printDebug(
    'Restore BT',
    'info',
    `psql -d ${process.env.PG_BT_DB} -f app/pgdumpBT.sql --username ${process.env.PG_BT_USER} --password --host=${process.env.PG_BT_HOST} -v ON_ERROR_STOP=1`,
  );
  printDebug(
    'Restore RR',
    'info',
    `psql -d ${process.env.PG_RR_DB} -f app/pgdumpRR.sql --username ${process.env.PG_RR_USER} --password --host=${process.env.PG_RR_HOST} -v ON_ERROR_STOP=1`,
  );
}

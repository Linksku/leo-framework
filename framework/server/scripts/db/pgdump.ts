import { promises as fs } from 'fs';
import path from 'path';
import fromPairs from 'lodash/fromPairs';
import trimEnd from 'lodash/trimEnd';

import EntityModels from 'services/model/allEntityModels';
import MaterializedViewModels from 'services/model/allMaterializedViewModels';
import doesPgTypeMatchSchema from 'utils/db/doesPgTypeMatchSchema';
import Entity from 'services/model/Entity';
import knexBT from 'services/knex/knexBT';
import knexRR from 'services/knex/knexRR';
import exec from 'utils/exec';
import getIndexName from 'utils/db/getIndexName';

type Tables = ObjectOf<{
  cols: ObjectOf<string>,
  lines: {
    col: string,
    line: string,
    idx: number,
  }[],
  uniqueIndexes: {
    name: string,
    cols: string,
  }[],
  normalIndexes: {
    name: string,
    cols: string,
  }[],
}>;

function parseTables(lines: string[]) {
  let hasError = false;
  function printError(str: string) {
    printDebug(str, 'error');
    hasError = true;
  }

  const tables: Tables = Object.create(null);

  // Parse columns
  let tableCols: ObjectOf<string> | null = null;
  let tableLines: {
    col: string,
    line: string,
    idx: number,
  }[] | null = null;
  lines = lines.filter((line, idx) => {
    if (!line.trim() || line.startsWith('--') || line.startsWith('SET ')) {
      return false;
    }

    if (tableCols && line === ');') {
      tableCols = null;
    } else if (tableCols && tableLines) {
      const match = line.match(/^\s*"?(\w+)"? .+/);
      if (!match?.[1]) {
        printError(`Column not found in "${line}"`);
      } else {
        tableCols[match[1]] = line.replace(/\s*"?\w+"? (.+?)/, '$1');
        tableCols[match[1]] = trimEnd(tableCols[match[1]], ',');
        tableLines.push({
          col: match[1],
          line,
          idx,
        });
      }
    } else if (!tableCols && line.startsWith('CREATE TABLE ')) {
      const tableName = line.replace(/CREATE TABLE (?:IF NOT EXISTS )?(?:\w+\.)?"?(\w+)"? \(/, '$1');
      if (tables[tableName]) {
        printError(`Duplicate "${tableName}"`);
      }
      tableCols = {};
      tableLines = [];
      tables[tableName] = {
        cols: tableCols,
        lines: tableLines,
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
    const match = line.match(/^\s*ALTER TABLE (?:ONLY )?(?:\w+\.)?"?(\w+)"? ADD CONSTRAINT "?(\w+)"? (\w+) KEY \(([^)]+)\)/);
    const table = match && tables[match[1]];
    if (table) {
      if (match[3] === 'PRIMARY') {
        table.uniqueIndexes.unshift({
          name: match[2],
          cols: match[4].replaceAll(/"|\s/g, ''),
        });
      } else if (match[3] !== 'FOREIGN') {
        printError(`Unhandled key "${line}"`);
      }
      return false;
    }
    return true;
  });

  // Parse indexes
  lines = lines.filter(line => {
    const match = line.match(/^\s*CREATE (\w+ )?INDEX "?(\w+)"? ON (?:\w+\.)?"?(\w+)"? USING \w+ \((.+?)\)( WHERE .+)?;$/);
    const table = match && tables[match[3]];
    if (table) {
      const cols = match[4].replaceAll(/"|\s/g, '');
      if (match[1] === 'UNIQUE ') {
        table.uniqueIndexes.push({
          name: match[2],
          cols,
        });
      } else {
        table.normalIndexes.push({
          name: match[2],
          cols,
        });
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
      ...table.normalIndexes.map(idx => idx.cols),
      ...table.uniqueIndexes.map(idx => idx.cols),
    ]);
    if (tableIndexesSet.size !== table.normalIndexes.length + table.uniqueIndexes.length) {
      printError(`Table "${tableName}" has duplicate index.`);
    }

    if (!isBT) {
      const normalIndexes = [
        ...Model.getNormalIndexes().map(idx => ({
          name: getIndexName(Model.tableName, idx),
          expression: idx.join(','),
        })),
        ...Model.expressionIndexes.map(idx => ({
          name: getIndexName(Model.tableName, idx.cols ?? idx.col),
          expression: idx.expression,
        })),
      ];
      const normalIndexExpressions = new Set(normalIndexes.map(idx => idx.expression));
      for (const index of normalIndexes) {
        if (!table.normalIndexes.some(
          index2 => index2.name === index.name && index2.cols === index.expression,
        )) {
          printError(`Table "${tableName}" is missing index "${index.name}".`);
        }
      }
      for (const index of table.normalIndexes) {
        if (!normalIndexExpressions.has(index.cols)) {
          printError(`Table "${tableName}" has extra index "${index.name}".`);
        }
      }
    }

    const uniqueIndexes = !isBT && Model.prototype instanceof Entity
      ? (Model as EntityClass).getUniqueIndexesForRR()
      : Model.getUniqueIndexes();
    const uniqueIndexesSet = new Set(uniqueIndexes.map(idx => idx.join(',')));
    for (const index of uniqueIndexesSet) {
      const name = getIndexName(Model.tableName, index.split(','));
      if (!table.uniqueIndexes.some(index2 => index2.name === name && index2.cols === index)) {
        printError(`Table "${tableName}" is missing unique index "${name}".`);
      }
    }
    for (const index of table.uniqueIndexes) {
      if (!uniqueIndexesSet.has(index.cols)) {
        printError(`Table "${tableName}" has extra unique index "${index}".`);
      }
    }
  }

  if (hasError) {
    throw new Error('Had errors');
  }
  printDebug('Verified tables', 'success');
}

function reorderColumns(tables: Tables, models: ModelClass[], lines: string[]) {
  const tableNameToModel = fromPairs(
    models.map(m => [m.tableName, m]),
  );
  for (const [tableName, table] of TS.objEntries(tables)) {
    const Model = TS.defined(tableNameToModel[tableName]);
    const colToIdx = fromPairs(Object.keys(Model.getSchema()).map((col, idx) => [col, idx]));
    const tableLines = table.lines.slice().sort((a, b) => colToIdx[a.col] - colToIdx[b.col]);
    const firstLineIdx = Math.min(...tableLines.map(line => line.idx));
    for (const [idx, line] of tableLines.entries()) {
      if (idx !== tableLines.length - 1 && !line.line.endsWith(',')) {
        line.line = `${line.line},`;
      } else if (idx === tableLines.length - 1 && line.line.endsWith(',')) {
        line.line = line.line.slice(0, -1);
      }

      lines.splice(firstLineIdx + idx, 1, line.line);
    }
  }
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
  const rows = await (isBT ? knexBT : knexRR).raw('SHOW TIMEZONE');
  if (rows?.rows?.[0]?.TimeZone !== 'UTC') {
    ErrorLogger.fatal(new Error('DB isn\'t UTC.'));
  }
  const out = await exec(
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
    .split('\n')
    .filter(line => !line.startsWith('-- Dumped from ') && !line.startsWith('-- Dumped by '));

  if (!isBT) {
    const createSchemaIdx = lines.findIndex(line => line.startsWith('CREATE SCHEMA '));
    lines.splice(createSchemaIdx + 1, 0, `

CREATE EXTENSION IF NOT EXISTS postgis SCHEMA "${process.env.PG_RR_SCHEMA}";

CREATE EXTENSION IF NOT EXISTS tsm_system_rows SCHEMA "${process.env.PG_RR_SCHEMA}";`);
  }

  const tables = parseTables(lines);

  verifyModels(tables, models, isBT);

  reorderColumns(tables, models, lines);

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

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
import isColDescNullsLast from 'utils/models/isColDescNullsLast';
import {
  PG_BT_HOST,
  PG_BT_PORT,
  PG_BT_SCHEMA,
  PG_RR_HOST,
  PG_RR_PORT,
  PG_RR_SCHEMA,
} from 'consts/infra';
import shallowEqual from 'utils/shallowEqual';

type Tables = ObjectOf<{
  cols: ObjectOf<string>,
  lines: {
    col: string,
    line: string,
    idx: number,
  }[],
  uniqueIndexes: {
    name: string,
    primary: boolean,
    cols: string[],
    expression: string,
  }[],
  normalIndexes: {
    name: string,
    cols: string[],
    expression: string,
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

    if (tableCols && line.endsWith(');')) {
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
          primary: true,
          cols: match[4].replaceAll(/"/g, '').split(',').map(col => col.trim()),
          expression: match[4],
        });
      } else if (match[3] !== 'FOREIGN') {
        printError(`Unhandled key "${line}"`);
      }
      return false;
    }
    if (match) {
      printError(`Index "${match[3]}" without table "${match[1]}"`);
    }
    return true;
  });

  // Parse indexes
  lines = lines.filter(line => {
    const match = line.match(/^\s*CREATE (\w+ )?INDEX "?(\w+)"? ON (?:\w+\.)?"?(\w+)"? USING (\w+ \((.+?)\))( WHERE .+)?( NULLS NOT DISTINCT)?;$/);
    const table = match && tables[match[3]];
    if (table) {
      const cols = match[5].replaceAll(/"/g, '').split(',').map(col => col.trim());
      if (match[1] === 'UNIQUE ') {
        table.uniqueIndexes.push({
          name: match[2],
          primary: false,
          cols,
          expression: match[4],
        });
      } else {
        table.normalIndexes.push({
          name: match[2],
          cols,
          expression: match[4],
        });
      }
      return false;
    }
    if (match) {
      printError(`Index "${match[2]}" without table "${match[3]}"`);
    }
    return true;
  });

  // Filter unhandled lines
  let alterTable = false;
  lines = lines.filter(line => {
    if (alterTable) {
      if (line.endsWith(');')) {
        alterTable = false;
      }
      return false;
    }

    const match = line.match(/^\s*ALTER TABLE (?:\w+\.)?"?(\w+)"? ALTER COLUMN /);
    if (match) {
      alterTable = true;
      return false;
    }

    return true;
  });

  if (hasError) {
    throw new Error('pgdump: had errors');
  }

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
      if (!tableName.startsWith('_')) {
        printError(`Extra table "${tableName}"`);
      }
      continue;
    }

    for (const col of TS.objKeys(table.cols)) {
      if (!TS.hasProp(Model.getSchema(), col)) {
        printError(`Table "${tableName}" has extra "${col}"`);
      }
    }

    for (const [col, schema] of Object.entries(Model.getSchema())) {
      const colType = table.cols[col];
      if (!colType) {
        printError(`Table "${tableName}" is missing "${col}"`);
        continue;
      }

      const error = doesPgTypeMatchSchema({
        Model,
        colName: col,
        schema,
        colType,
      });
      if (error) {
        printError(`Column "${tableName}.${col}" ${error}.`);
      }
    }

    const allTableIndexesSet = new Set([
      ...table.normalIndexes.map(index => index.cols.join(',')),
      ...table.uniqueIndexes.map(index => index.cols.join(',')),
    ]);
    if (allTableIndexesSet.size !== table.normalIndexes.length + table.uniqueIndexes.length) {
      printError(`Table "${tableName}" has duplicate index.`);
    }

    if (!isBT) {
      const normalIndexes = Model.getNormalIndexes().map(index => ({
        name: getIndexName(Model.tableName, index),
        cols: index.map(
          col => (isColDescNullsLast(Model, col)
            ? `${col} DESC NULLS LAST`
            : col),
        ),
      }));
      const expressionIndexes = Model.expressionIndexes.map(index => ({
        name: index.name ?? getIndexName(Model.tableName, index.cols ?? index.col),
        expression: index.expression,
      }));

      for (const index of normalIndexes) {
        if (!table.normalIndexes.some(
          index2 => index2.name === index.name && shallowEqual(index2.cols, index.cols),
        )) {
          printError(`Table "${tableName}" is missing index "${index.name}".`);
        }
      }
      for (const index of expressionIndexes) {
        if (!table.normalIndexes.some(
          index2 => index2.name === index.name && index2.expression === index.expression,
        )) {
          printError(`Table "${tableName}" is missing index "${index.name}".`);
        }
      }
      for (const index of table.normalIndexes) {
        if (
          !normalIndexes.some(
            index2 => index2.name === index.name && shallowEqual(index2.cols, index.cols),
          )
          && !expressionIndexes.some(
            index2 => index2.name === index.name && index2.expression === index.expression,
          )
        ) {
          printError(`Table "${tableName}" has extra index "${index.name}".`);
        }
      }
    }

    const uniqueIndexesRaw = !isBT && Model.prototype instanceof Entity
      ? (Model as EntityClass).getUniqueIndexesForRR()
      : Model.getUniqueIndexes();
    const uniqueIndexes = uniqueIndexesRaw.map((index, idx) => ({
      name: getIndexName(Model.tableName, index),
      cols: index.map(
        col => (idx !== 0 && isColDescNullsLast(Model, col)
          ? `${col} DESC NULLS LAST`
          : col),
      ),
    }));

    for (const [i, index] of uniqueIndexes.entries()) {
      const tableIndex = table.uniqueIndexes.find(
        index2 => index2.name === index.name && shallowEqual(index2.cols, index.cols),
      );
      if (!tableIndex) {
        printError(`Table "${tableName}" is missing unique index "${index.name}".`);
      } else if (i === 0 && !tableIndex.primary) {
        printError(`Table "${tableName}"'s "${index.name}" isn't primary.`);
      }
    }
    for (const index of table.uniqueIndexes) {
      if (!uniqueIndexes.some(
        index2 => index2.name === index.name && shallowEqual(index2.cols, index.cols),
      )) {
        printError(`Table "${tableName}" has extra unique index "${index.name}".`);
      }
    }
  }

  if (hasError) {
    throw new Error('pgdump: had errors');
  }
  printDebug('Verified tables', 'success');
}

function reorderColumns(tables: Tables, models: ModelClass[], lines: string[]) {
  const tableNameToModel = fromPairs(
    models.map(m => [m.tableName, m]),
  );
  for (const [tableName, table] of TS.objEntries(tables)) {
    if (tableName.startsWith('_')) {
      continue;
    }

    const Model = TS.defined(tableNameToModel[tableName]);
    const colToIdx = fromPairs(Object.keys(Model.getSchema()).map((col, idx) => [col, idx]));
    const tableLines = [...table.lines].sort((a, b) => colToIdx[a.col] - colToIdx[b.col]);
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
  port: number,
  user: string,
  pass: string,
  db: string,
  schema: string,
  isBT: boolean,
  outFile: string,
}) {
  const rows = await (isBT ? knexBT : knexRR).raw('SHOW TIMEZONE');
  if (rows?.rows?.[0]?.TimeZone !== 'UTC') {
    await ErrorLogger.fatal(new Error('pgdump: DB isn\'t UTC.'));
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
    throw new Error('pgdump: no output');
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

CREATE EXTENSION IF NOT EXISTS postgis SCHEMA "${PG_RR_SCHEMA}";

CREATE EXTENSION IF NOT EXISTS tsm_system_rows SCHEMA "${PG_RR_SCHEMA}";`);
  }
  await fs.writeFile(
    path.resolve(`./app/${outFile}.sql`),
    lines.join('\n'),
  );

  const tables = parseTables(lines);

  verifyModels(tables, models, isBT);

  reorderColumns(tables, models, lines);
}

export default async function pgdump() {
  printDebug('Dumping BT', 'info');
  await dumpDb({
    models: EntityModels,
    host: PG_BT_HOST,
    port: PG_BT_PORT,
    user: process.env.PG_BT_USER,
    pass: process.env.PG_BT_PASS,
    db: process.env.PG_BT_DB,
    schema: PG_BT_SCHEMA,
    isBT: true,
    outFile: 'pgdumpBT',
  });

  printDebug('Dumping RR', 'info');
  await dumpDb({
    models: [
      ...EntityModels,
      ...MaterializedViewModels.filter(model => model.getReplicaTable()),
    ],
    host: PG_RR_HOST,
    port: PG_RR_PORT,
    user: process.env.PG_RR_USER,
    pass: process.env.PG_RR_PASS,
    db: process.env.PG_RR_DB,
    schema: PG_RR_SCHEMA,
    isBT: false,
    outFile: 'pgdumpRR',
  });

  printDebug(
    'Restore BT',
    'info',
    {
      details: `psql -d ${process.env.PG_BT_DB} -f app/pgdumpBT.sql --username ${process.env.PG_BT_USER} --password --host=${PG_BT_HOST} -v ON_ERROR_STOP=1`,
    },
  );
  printDebug(
    'Restore RR',
    'info',
    {
      details: `psql -d ${process.env.PG_RR_DB} -f app/pgdumpRR.sql --username ${process.env.PG_RR_USER} --password --host=${PG_RR_HOST} -v ON_ERROR_STOP=1`,
    },
  );
}

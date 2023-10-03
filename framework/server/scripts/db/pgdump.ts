import { promises as fs } from 'fs';
import path from 'path';
import fromPairs from 'lodash/fromPairs.js';
import trimEnd from 'lodash/trimEnd.js';
import isEqual from 'lodash/isEqual.js';

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
    cols: {
      name: string,
      nulls: string,
    }[],
    expression: string,
  }[],
  normalIndexes: {
    name: string,
    cols: {
      name: string,
      nulls: string,
    }[],
    expression: string,
  }[],
  foreignKeys: {
    name: string,
    col: string,
    expression: string,
    references: [string, string],
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
      tableCols = Object.create(null);
      tableLines = [];
      tables[tableName] = {
        cols: tableCols,
        lines: tableLines,
        uniqueIndexes: [],
        normalIndexes: [],
        foreignKeys: [],
      };
    } else {
      return true;
    }
    return false;
  });

  // Parse constraints
  lines = lines.filter(line => {
    const match = line.match(
      /^\s*ALTER TABLE (?:ONLY )?(?:\w+\.)?"?(\w+)"? ADD CONSTRAINT "?(\w+)"? (\w+) KEY \(([^)]+)\)\s*(?:REFERENCES (?:"?\w+"?\.)?([^)]+\)))?/,
    );
    const table = match && tables[match[1]];
    if (table) {
      if (match[3] === 'PRIMARY') {
        table.uniqueIndexes.unshift({
          name: match[2],
          primary: true,
          cols: match[4].replaceAll('"', '').split(',')
            .map(col => col.trim()).map(col => {
              const idx = col.indexOf(' ');
              return {
                name: idx > 0 ? col.slice(0, idx) : col,
                nulls: idx > 0 ? col.slice(idx + 1) : 'ASC NULLS FIRST',
              };
            }),
          expression: match[4],
        });
      } else if (match[3] === 'FOREIGN') {
        const references = match[5]
          .replace(')', '')
          .replaceAll('"', '')
          .split('(') as [string, string];
        table.foreignKeys.unshift({
          name: match[2],
          col: match[4].replaceAll('"', '').trim(),
          expression: match[4],
          references,
        });
      } else {
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
    const match = line.match(
      /^\s*CREATE (\w+ )?INDEX "?(\w+)"? ON (?:\w+\.)?"?(\w+)"? USING (\w+ \((.+?)\))( WHERE .+)?( NULLS NOT DISTINCT)?;$/,
    );
    const table = match && tables[match[3]];
    if (table) {
      const cols = match[5].replaceAll('"', '').split(',').map(col => col.trim());
      if (match[1] === 'UNIQUE ') {
        table.uniqueIndexes.push({
          name: match[2],
          primary: false,
          cols: cols.map(col => {
            const idx = col.indexOf(' ');
            return {
              name: idx > 0 ? col.slice(0, idx) : col,
              nulls: idx > 0 ? col.slice(idx + 1) : 'ASC NULLS FIRST',
            };
          }),
          expression: match[4],
        });
      } else {
        table.normalIndexes.push({
          name: match[2],
          cols: cols.map(col => {
            const idx = col.indexOf(' ');
            return {
              name: idx > 0 ? col.slice(0, idx) : col,
              nulls: idx > 0 ? col.slice(idx + 1) : 'ASC NULLS FIRST',
            };
          }),
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

      if (isBT
        && col !== 'id'
        && Model.relations[col]
        && !table.foreignKeys.some(fk => fk.col === col)) {
        printError(`Column "${tableName}.${col}" needs a foreign key.`);
      }
    }

    const allTableIndexesArr = [
      ...table.normalIndexes.map(index => index.cols.map(
        col => `${col.name} ${col.nulls}`,
      ).join(',')),
      ...table.uniqueIndexes.map(index => index.cols.map(
        col => `${col.name} ${col.nulls}`,
      ).join(',')),
    ];
    const allTableIndexesSet = new Set(allTableIndexesArr);
    if (allTableIndexesSet.size !== allTableIndexesArr.length) {
      const duplicates = allTableIndexesArr
        .filter((val, idx) => allTableIndexesArr.indexOf(val) !== idx);
      printError(`Table "${tableName}" has duplicate indexes: ${duplicates.join(', ')}`);
    }

    // Verify normal indexes
    if (isBT) {
      for (const index of table.normalIndexes) {
        let found = false;
        for (const fk of table.foreignKeys) {
          if (index.cols.some(col => col.name === fk.col)) {
            found = true;
            break;
          }
        }
        if (!found) {
          printError(`Table "${tableName}" has extra normal index "${index.name}.`);
        }

        if (index.name !== getIndexName(Model.tableName, index.cols.map(col => col.name))) {
          printError(`Table "${tableName}" has wrong index name "${index.name}".`);
        }
      }
    } else {
      const normalIndexes = Model.getNormalIndexes().map(index => ({
        name: getIndexName(Model.tableName, index),
        cols: index.map(col => ({
          name: col,
          nulls: isColDescNullsLast(Model, col)
            ? 'DESC NULLS LAST'
            : 'ASC NULLS FIRST',
        })),
      }));
      const expressionIndexes = Model.expressionIndexes.map(index => ({
        name: index.name ?? getIndexName(Model.tableName, index.cols ?? index.col),
        expression: index.expression,
      }));

      for (const index of normalIndexes) {
        if (!table.normalIndexes.some(
          index2 => index2.name === index.name && isEqual(index2.cols, index.cols),
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
            index2 => index2.name === index.name && isEqual(index2.cols, index.cols),
          )
          && !expressionIndexes.some(
            index2 => index2.name === index.name && index2.expression === index.expression,
          )
        ) {
          printError(`Table "${tableName}" has extra index "${index.name}".`);
        }
      }
    }

    // Verify unique indexes
    const uniqueIndexesRaw = !isBT && TS.extends(Model, Entity)
      ? Model.getUniqueIndexesForRR()
      : Model.getUniqueIndexes();
    const uniqueIndexes = uniqueIndexesRaw.map((index, idx) => ({
      name: getIndexName(Model.tableName, index),
      cols: index.map(col => ({
        name: col,
        nulls: idx !== 0 && isColDescNullsLast(Model, col)
          ? 'DESC NULLS LAST'
          : 'ASC NULLS FIRST',
      })),
    }));

    for (const [i, index] of uniqueIndexes.entries()) {
      const tableIndex = table.uniqueIndexes.find(
        index2 => index2.name === index.name && isEqual(index2.cols, index.cols),
      );
      if (!tableIndex) {
        printError(`Table "${tableName}" is missing unique index "${index.name}".`);
      } else if (i === 0 && !tableIndex.primary) {
        printError(`Table "${tableName}"'s "${index.name}" isn't primary.`);
      }
    }
    for (const index of table.uniqueIndexes) {
      if (!uniqueIndexes.some(
        index2 => index2.name === index.name && isEqual(index2.cols, index.cols),
      )) {
        printError(`Table "${tableName}" has extra unique index "${index.name}".`);
      }
    }

    // Verify foreign keys
    if (isBT && TS.extends(Model, Entity)) {
      for (const fk of table.foreignKeys) {
        if (Model.deleteable
          && !table.normalIndexes.some(idx => idx.cols[0]?.name === fk.col)
          && !table.uniqueIndexes.some(idx => idx.cols[0]?.name === fk.col)) {
          printError(`"${tableName}.${fk.col}" is missing index for foreign key "${fk.name}".`);
        }

        const referenceTable = TS.defined(tables[fk.references[0]]);
        const referenceCol = fk.references[1];
        if (!referenceTable.uniqueIndexes.some(idx => idx.cols[0]?.name === referenceCol)) {
          printError(`Table "${fk.references[0]}" is missing unique index on "${referenceCol}" referenced by "${fk.name}".`);
        }

        if (fk.name !== `${tableName}_${fk.col}_fk`) {
          printError(`Table "${tableName}" has wrong foreign key name "${fk.name}".`);
        }
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
    .replaceAll('\nCREATE SCHEMA ', '\nCREATE SCHEMA IF NOT EXISTS ')
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

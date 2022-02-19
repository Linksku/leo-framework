import { promises as fs } from 'fs';
import path from 'path';
import childProcess from 'child_process';
import { promisify } from 'util';
import fromPairs from 'lodash/fromPairs';

import _models from 'lib/Model/models';
import BTEntity from 'lib/Model/BTEntity';

const models = fromPairs(
  _models
    .filter(m => m.Model.prototype instanceof BTEntity)
    .map(m => [m.Model.tableName, m.Model]),
);

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
    if (curCols && line === ');') {
      curCols = null;
    } else if (curCols) {
      const match = line.match(/^\s*"?(\w+)"? .+/);
      if (!match?.[1]) {
        printError(`Column not found in "${line}"`);
      } else {
        curCols[match[1]] = line.replace(/\s*"?\w+"? (.+)/, '$1');
      }
    } else if (!curCols && line.startsWith('CREATE TABLE ')) {
      const tableName = line.replace(/CREATE TABLE (?:\w+\.)?"?(\w+)"? \(/, '$1');
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

  // Parse indexes
  lines = lines.filter(line => {
    const match = line.match(/^\s*ALTER TABLE (?:ONLY )?(?:\w+\.)?"?(\w+)"? ADD CONSTRAINT "\w+" (\w+) KEY \(([^)]+)\)/);
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

  lines = lines.filter(line => {
    const match = line.match(/^\s*CREATE (\w+ )?INDEX.+ ON (?:\w+\.)?"?(\w+).+\(([^)]+)\);/);
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

  console.log(lines.join('\n'));
  return tables;
}

function verifyModels(tables: Tables) {
  let hasError = false;
  function printError(str: string) {
    printDebug(str, 'error');
    hasError = true;
  }

  for (const tableName of Object.keys(models)) {
    if (!tables[tableName]) {
      printError(`No table "${tableName}"`);
    }
  }

  for (const [tableName, table] of TS.objEntries(tables)) {
    const Model = models[tableName];
    if (!Model) {
      printError(`No model "${tableName}"`);
      continue;
    }

    for (const col of TS.objKeys(table.cols)) {
      if (!TS.hasProp(Model.getSchema(), col)) {
        printError(`Model "${tableName}" is missing "${col}"`);
      }
    }

    for (const col of Object.keys(Model.getSchema())) {
      if (!table.cols[col]) {
        printError(`Table "${tableName}" is missing "${col}"`);
      }
    }
  }

  if (hasError) {
    throw new Error('Had errors');
  }

  printDebug('Verified tables', 'success');
}

export default async function pgdump() {
  const out = await promisify(childProcess.exec)(
    `pg_dump --host ${process.env.POSTGRES_HOST} --username ${process.env.POSTGRES_USER} --schema-only --format=plain --no-owner --schema ${process.env.POSTGRES_DB} ${process.env.POSTGRES_DB}`,
  );

  if (out.stderr) {
    throw new Error(out.stderr);
  }
  const data = out.stdout;
  if (!data) {
    throw new Error('pgdump failed.');
  }
  const lines = data
    .replaceAll(/(\n\n\s*ALTER TABLE [^;]+)\s*\n\s*([^;]+;)/g, '$1 $2')
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('--') && !line.startsWith('SET '));

  const tables = parseTables(lines);
  console.log(tables);

  verifyModels(tables);

  await fs.writeFile(
    path.resolve('./app/pgdump.sql'),
    data,
  );

  console.log(`To restore: Restore: psql -d ${process.env.POSTGRES_DB} -f app/pgdump.sql --username ${process.env.POSTGRES_USER} --password --host=${process.env.POSTGRES_HOST}`);
}

import { promises as fs } from 'fs';
import path from 'path';
import childProcess from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';

import shouldIndexDesc from 'lib/dbUtils/shouldIndexDesc';

export default async function mysqldump() {
  const out = await promisify(childProcess.exec)(
    `mysqldump -u ${process.env.MYSQL_USER} -p -h ${process.env.MYSQL_HOST} -d --opt ${process.env.MYSQL_DB} --skip-add-drop-table`,
  );

  if (out.stderr) {
    throw new Error(out.stderr);
  }
  let data = out.stdout;
  if (!data) {
    throw new Error('mysqldump failed.');
  }

  data = data.replace(/ AUTO_INCREMENT=\d*/g, '');

  let hasError = false;
  let curTable = '';
  let printedTableName = false;
  let columnOrder: ObjectOf<number> = {};
  let indexes: {
    columns: string[],
    line: string,
  }[] = [];
  let lastIndexIdx = 0;

  function printError(str: string, line: string) {
    if (!printedTableName) {
      console.log(chalk.bold(`\n${curTable}`));
    }

    console.error(
      chalk.yellowBright(`${str}:`),
      line.trim(),
    );
    hasError = true;
    printedTableName = true;
  }

  const lines = data.split('\n');
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    const createTable = line.match(/\bCREATE TABLE `([^`]+)` \(/);
    if (createTable) {
      curTable = createTable[1];
      printedTableName = false;
      columnOrder = {};
      indexes = [];
      continue;
    }

    const column = line.match(/^ {2}`(\w+)` [a-z]+/);
    if (column) {
      columnOrder[column[1]] = i;
      continue;
    }

    const namedIndex = line.match(/\s*(?:\w+ )?KEY `(\w+)` \(/);
    if (namedIndex && namedIndex[1].startsWith('fk_')) {
      printError(`Maybe MySQL autogenerated "${namedIndex[1]}":`, line);
    }

    const keyColumns = line.match(/^\s*(?:\w+ )?KEY [^(]*\((.+)\)/);
    if (keyColumns) {
      if (line.includes(' INVISIBLE ')) {
        printError(`Index is invisible:`, line);
      }

      const columns = keyColumns[1]
        .split(',')
        .map(str => str
          .split(' ')
          .map(str2 => str2.replace(/`(\w+)`.*/, '$1')));
      for (const col of columns) {
        const name = col[0];

        if (col.length > 2) {
          printError(`Invalid index column "${name}":`, line);
        }

        const isDesc = col[1] === 'DESC';
        if (shouldIndexDesc(name) && !isDesc) {
          printError(`Index "${name}" should be DESC:`, line);
        }
      }

      indexes.push({
        columns: columns.map(c => c[0]),
        line,
      });
      lines.splice(i, 1);
      lastIndexIdx = i;
      i--;
      continue;
    }

    const foreignKey = line.match(/\bFOREIGN KEY \(`(\w+)`(.*)\)/);
    if (foreignKey && shouldIndexDesc(foreignKey[1]) && foreignKey[2] !== ' DESC') {
      lines[i] = line = line.replace(/\bFOREIGN KEY \(`(\w+)`[^)]*\)/, 'FOREIGN KEY (`$1` DESC)');
      continue;
    }

    if (line.startsWith(') ENGINE=InnoDB ') && indexes.length) {
      for (const d of indexes) {
        if (!d.line.endsWith(',')) {
          d.line += ',';
        }
        for (const c of d.columns) {
          if (!columnOrder[c]) {
            printError(`Unknown column ${c} in index name`, d.line);
          }
        }
      }
      indexes.sort((a, b) => {
        for (let j = 0; j < 10; j++) {
          const aCol = a.columns[j];
          const bCol = b.columns[j];
          if (!aCol) {
            return -1;
          }
          if (!bCol) {
            return 1;
          }
          if (aCol === bCol) {
            continue;
          }
          return TS.defined(columnOrder[aCol]) - TS.defined(columnOrder[bCol]);
        }
        return 0;
      });

      if (lastIndexIdx === i) {
        indexes[indexes.length - 1].line = indexes[indexes.length - 1].line.slice(0, -1);
      }
      lines.splice(lastIndexIdx, 0, ...indexes.map(d => d.line));
      i += indexes.length;
    }
  }
  data = lines.join('\n');

  if (hasError) {
    throw new Error('Invalid output.');
  }

  await fs.writeFile(
    path.resolve('./app/mysqldump.sql'),
    data,
  );
}
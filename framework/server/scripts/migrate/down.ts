import type { Arguments } from 'yargs';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';

import { updateMigrationState } from './helpers/migrationState';
import { getMigration, getPrevMigration } from './helpers/migrationFiles';

dayjs.extend(customParseFormat);

export default async function migrateDown(params: Arguments) {
  let filename = params._[2];
  if (typeof filename !== 'string') {
    throw new TypeError('migrateDown: invalid migration file name');
  }
  const parts = filename.split('/');
  filename = parts.at(-1);
  if (filename.endsWith('.ts')) {
    filename = filename.slice(0, -3);
  }

  const migration = await getMigration(`${filename}.ts`);
  if (!migration.down) {
    throw new Error('migrateDown: missing down()');
  }
  const ret = migration.down();
  if (!(ret instanceof Promise)) {
    throw new TypeError('migrateDown: down() didn\'t return promise');
  }
  await ret;

  await updateMigrationState(
    await getPrevMigration(filename),
    {
      type: 'up',
      files: [`${filename}.ts`],
    },
  );

  printDebug('Down 1 migration', 'success');
}

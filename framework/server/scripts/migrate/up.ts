import type { Arguments } from 'yargs';
import dayjs from 'dayjs';

import { getMigrationState, updateMigrationState } from './helpers/migrationState';
import { getMigration, getAllMigrations } from './helpers/migrationFiles';
import syncDbAfterMigration from './helpers/syncDbAfterMigration';

export default async function migrateUp(params: Arguments) {
  let paramsFilename = params._[2];
  if (paramsFilename) {
    if (typeof paramsFilename !== 'string') {
      throw new TypeError('migrateUp: invalid migration file name');
    }
    const parts = paramsFilename.split('/');
    paramsFilename = parts[parts.length - 1];
    if (!paramsFilename.endsWith('.ts')) {
      paramsFilename = `${paramsFilename.slice(0, -3)}.ts`;
    }

    const migration = getMigration(paramsFilename);
    await migration.up();

    await updateMigrationState(paramsFilename, {
      type: 'down',
      files: [paramsFilename],
    });
    await syncDbAfterMigration();

    printDebug('Completed 1 migration', 'success');
    return;
  }

  const migrationState = await getMigrationState();
  const currentTime = dayjs().format('YYYY-MM-DD_HHmmss');
  const allMigrations = getAllMigrations();
  const filesRan: string[] = [];
  let hadError = false;
  for (const filename of allMigrations) {
    if (filename > currentTime) {
      throw new Error(`migrateUp: migration time is in the future: "${filename}"`);
    }
    if (filename > migrationState.lastMigration) {
      const migration = getMigration(filename);

      printDebug(`Running ${filename}`, 'info');
      const ret = migration.up();
      if (!(ret instanceof Promise)) {
        throw new TypeError(`migrateUp: ${filename}.up didn't return promise`);
      }
      try {
        await ret;
        filesRan.push(filename);
      } catch (err) {
        console.log(err);
        hadError = true;
        break;
      }
    }
  }

  if (filesRan.length) {
    await updateMigrationState(filesRan[filesRan.length - 1], {
      type: 'down',
      files: filesRan.reverse(),
    });

    if (!hadError) {
      await syncDbAfterMigration();
    }
  }

  printDebug(`Ran ${filesRan.length} migrations`, 'success');
}

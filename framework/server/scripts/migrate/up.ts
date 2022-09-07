import type { Arguments } from 'yargs';
import dayjs from 'dayjs';

import pgdump from 'scripts/db/pgdump';
import recreateMZ from 'scripts/recreateMZ';
import recreateMVInfra from 'scripts/recreateMVInfra';
import exec from 'utils/exec';
import { getMigrationState, updateMigrationState } from './helpers/migrationState';
import { getMigration, getAllMigrations } from './helpers/migrationFiles';

// todo: mid/mid rebuild MZ after migrating BT
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

    const migration = await getMigration(paramsFilename);
    await migration.up();

    await updateMigrationState(paramsFilename, {
      type: 'down',
      files: [paramsFilename],
    });

    printDebug('Completed 1 migration', 'success');
    return;
  }

  const migrationState = await getMigrationState();
  const currentTime = dayjs().format('YYYY-MM-DD_HHmmss');
  const allMigrations = await getAllMigrations();
  const filesRan: string[] = [];
  for (const filename of allMigrations) {
    if (filename > currentTime) {
      throw new Error(`migrateUp: migration time is in the future: "${filename}"`);
    }
    if (filename > migrationState.lastMigration) {
      const migration = await getMigration(filename);

      printDebug(`Running ${filename}`, 'info');
      const ret = migration.up();
      if (!(ret instanceof Promise)) {
        throw new TypeError(`migrateUp: ${filename}.up didn't return promise`);
      }
      try {
        await ret;
      } catch (err) {
        console.log(err);
        break;
      }
      filesRan.push(filename);
    }
  }

  if (filesRan.length) {
    await updateMigrationState(filesRan[filesRan.length - 1], {
      type: 'down',
      files: filesRan.reverse(),
    });
    await pgdump();
    const { btDiff, rrDiff } = await promiseObj({
      btDiff: exec('git diff --name-only app/pgdumpBT.sql'),
      rrDiff: exec('git diff --name-only app/pgdumpRR.sql'),
    });
    if (btDiff.stdout.trim().length) {
      await recreateMVInfra();
    } else if (rrDiff.stdout.trim().length) {
      await recreateMZ();
    }
  }

  printDebug(`Completed ${filesRan.length} migrations`, 'success');
}

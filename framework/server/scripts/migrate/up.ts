import type { Arguments } from 'yargs';
import { promises as fs } from 'fs';
import path from 'path';
import dayjs from 'dayjs';
import { mkdirp } from 'mkdirp';

import exec from 'utils/exec';
import {
  PG_BT_HOST,
  PG_BT_PORT,
  PG_BT_DB,
  PG_BT_SCHEMA,
} from 'consts/infra';
import pgdump from 'scripts/db/pgdump';
import { getMigrationState, updateMigrationState } from './helpers/migrationState';
import { getMigration, getAllMigrations } from './helpers/migrationFiles';
import syncMVsAfterMigration from './helpers/syncMVsAfterMigration';

export const DUMP_NAME_REGEX = new RegExp(`^${PG_BT_DB}_\\d{4}-\\d{2}-\\d{2}_\\d{6}_.*\\.dump$`);

async function deleteOldDbBackups() {
  printDebug('Deleting old db backups', 'info');
  let files = await fs.readdir('./backups');
  files = files.filter(f => DUMP_NAME_REGEX.test(f));

  for (const file of files.slice(-10)) {
    await fs.unlink(path.resolve(`./backups/${file}`));
  }
  printDebug(`Deleted ${files.length} ${pluralize('dump', files.length)}`, 'success');
}

async function createDbBackup(suffix: string) {
  printDebug('Creating db backups', 'info');
  const filename = `${PG_BT_DB}_${suffix}.dump`;
  if (!DUMP_NAME_REGEX.test(filename)) {
    printDebug(`createDbBackup: invalid filename "${filename}"`, 'warn');
  }

  await mkdirp(path.resolve('./backups'));
  await exec(
    `echo '${process.env.PG_BT_PASS}' | \
    pg_dump -F c --host ${PG_BT_HOST} --port ${PG_BT_PORT} --username ${process.env.PG_BT_USER} \
    --no-owner --schema ${PG_BT_SCHEMA} ${PG_BT_DB} \
    > backups/${filename}`,
    {
      env: {
        PGPASSWORD: process.env.PG_BT_PASS,
      } as unknown as NodeJS.ProcessEnv,
    },
  );
}

export default async function migrateUp(params: Arguments) {
  let paramsFilename = params._[2];
  if (paramsFilename) {
    if (typeof paramsFilename !== 'string') {
      throw new TypeError('migrateUp: invalid migration file name');
    }
    const parts = paramsFilename.split('/');
    paramsFilename = parts.at(-1);
    if (!paramsFilename.endsWith('.ts')) {
      paramsFilename = `${paramsFilename}.ts`;
    }
    const migration = getMigration(paramsFilename);

    if (process.env.SERVER === 'production') {
      await deleteOldDbBackups();
      await createDbBackup(paramsFilename.slice(0, -3));
    }

    try {
      printDebug('Running pgdump before migration', 'info');
      await pgdump();
    } catch (err) {
      printDebug(err, 'error', { ctx: 'pgdump' });
    }

    try {
      await migration.up();
    } catch (err) {
      printDebug(err, 'error', { ctx: `up(${paramsFilename})` });
      return;
    }

    await updateMigrationState(paramsFilename, {
      type: 'down',
      files: [paramsFilename],
    });
    await syncMVsAfterMigration();

    printDebug('Completed 1 migration', 'success');
    return;
  }

  const migrationState = await getMigrationState();
  const allMigrations = getAllMigrations();
  const migrationsToRun = allMigrations
    .filter(filename => filename > migrationState.lastMigration);
  if (!migrationsToRun.length) {
    printDebug('No migrations to run', 'info');
    return;
  }
  const currentTime = dayjs().format('YYYY-MM-DD_HHmmss');
  for (const filename of migrationsToRun) {
    if (filename > currentTime) {
      throw new Error(`migrateUp: migration time is in the future: "${filename}"`);
    }
  }

  if (process.env.SERVER === 'production') {
    await deleteOldDbBackups();
    await createDbBackup(TS.defined(migrationsToRun.at(-1)).slice(0, -3));
  }

  try {
    printDebug('Running pgdump before migrations', 'info');
    await pgdump();
  } catch (err) {
    printDebug(err, 'error', { ctx: 'pgdump' });
  }

  printDebug(`Running ${migrationsToRun.length} ${pluralize('migration', migrationsToRun.length)}`, 'info');
  const filesRan: string[] = [];
  for (const filename of migrationsToRun) {
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
      printDebug(err, 'error', { ctx: `up(${filename})` });
      break;
    }
  }

  if (TS.notEmpty(filesRan)) {
    await updateMigrationState(filesRan.at(-1), {
      type: 'down',
      files: filesRan.reverse(),
    });
  }

  if (filesRan.length === migrationsToRun.length) {
    printDebug('Sync MVs after migration', 'info');
    await syncMVsAfterMigration();

    printDebug(`Ran ${filesRan.length} migrations`, 'success');
  }
}

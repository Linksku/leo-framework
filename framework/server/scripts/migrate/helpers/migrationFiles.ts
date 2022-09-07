import { promises as fs } from 'fs';
import path from 'path';

export async function getAllMigrations() {
  const allMigrations = await fs.readdir(path.resolve('./app/server/migrations'));
  return allMigrations.sort();
}

export async function getMigration(filename: string) {
  if (!/^[\w-]+\.ts$/.test(filename)) {
    throw new Error('getMigration: invalid migration file name');
  }

  // eslint-disable-next-line import/no-dynamic-require, global-require
  const file = require(`../../../../../app/server/migrations/${filename}`);
  return TS.assertType<{
    up: AnyFunction,
    down?: AnyFunction,
  }>(
    val => val && typeof val.up === 'function' && (!val.down || typeof val.up === 'function'),
    file,
  );
}

export async function getPrevMigration(filename: string) {
  const allMigrations = await getAllMigrations();
  return allMigrations.reverse().find(m => m < filename) ?? '1000-00-00_000000.ts';
}

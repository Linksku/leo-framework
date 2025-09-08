import path from 'path';
import fs from 'fs/promises';

import fileExists from 'utils/fileExists';

export async function getAllMigrations() {
  // Also replace in getMigration and server-dockerfile
  const prevPathFromRoot = './app/server/migrations/2024';
  const curPathFromRoot = './app/server/migrations/2025';

  const exists = await Promise.all([
    fileExists(path.resolve(prevPathFromRoot)),
    fileExists(path.resolve(curPathFromRoot)),
  ]);
  if (!exists[0]) {
    throw new Error(`getAllMigrations: ${prevPathFromRoot} doesn't exist`);
  }
  if (!exists[1]) {
    throw new Error(`getAllMigrations: ${curPathFromRoot} doesn't exist`);
  }

  const files = await Promise.all([
    fs.readdir(path.resolve(prevPathFromRoot)),
    fs.readdir(path.resolve(curPathFromRoot)),
  ]);

  return files.flat().sort();
}

export async function getMigration(filename: string) {
  if (!filename.endsWith('.ts')) {
    filename += '.ts';
  }
  if (!/^[\w-]+\.ts$/.test(filename)) {
    throw getErr('getMigration: invalid migration file name', { filename });
  }

  const allMigrations = await getAllMigrations();
  const fullPath = allMigrations.find(m => m.endsWith(filename));
  if (!fullPath) {
    throw getErr('getMigration: migration not found', { filename });
  }

  // Path must be hardcoded, also replace in getAllMigrations and server-dockerfile
  const file = fullPath.startsWith('2024')
    ? await import(`../../../../../app/server/migrations/2024/${fullPath}`)
    : await import(`../../../../../app/server/migrations/2025/${fullPath}`);

  return TS.assertType<{
    up: AnyFunction,
    down?: AnyFunction,
  }>(
    file,
    val => TS.isObj(val)
      && typeof val.up === 'function'
      && (!val.down || typeof val.down === 'function'),
  );
}

export async function getPrevMigration(filename: string) {
  const allMigrations = await getAllMigrations();
  return allMigrations.slice().reverse().find(m => m < filename) ?? '1000-00-00_000000.ts';
}

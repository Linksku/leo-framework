import fileExists from 'utils/fileExists';

// Year must be hardcoded to avoid bundling all old migrations
const MIGRATIONS_PATH = '../../../../../app/server/migrations/2025';

export async function getAllMigrations() {
  if (!await fileExists(MIGRATIONS_PATH)) {
    return [];
  }

  const allMigrations = require.context(
    MIGRATIONS_PATH,
    true,
    /\.ts$/,
  );
  return allMigrations.keys()
    .map(k => k.slice(2))
    .sort();
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

  const file = await import(`${MIGRATIONS_PATH}/${fullPath}`);
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

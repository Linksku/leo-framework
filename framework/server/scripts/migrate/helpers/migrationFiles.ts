export function getAllMigrations() {
  // eslint-disable-next-line unicorn/prefer-module
  const allMigrations = require.context(
    // Year must be hardcoded
    '../../../../../app/server/migrations/2024',
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

  const allMigrations = getAllMigrations();
  const fullPath = allMigrations.find(m => m.endsWith(filename));
  if (!fullPath) {
    throw getErr('getMigration: migration not found', { filename });
  }

  // Hardcode year to avoid bundling all old migrations
  const file = await import('../../../../../app/server/migrations/2024/' + fullPath);
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

export function getPrevMigration(filename: string) {
  const allMigrations = getAllMigrations();
  return allMigrations.slice().reverse().find(m => m < filename) ?? '1000-00-00_000000.ts';
}

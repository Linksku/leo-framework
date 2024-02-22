// todo: low/easy subdirectories for migrations
export function getAllMigrations() {
  // eslint-disable-next-line unicorn/prefer-module
  const allMigrations = require.context('../../../../../app/server/migrations', false, /\.ts$/);
  return allMigrations.keys()
    .map(k => k.slice(2))
    .sort();
}

export function getMigration(filename: string) {
  if (!/^[\w-]+\.ts$/.test(filename)) {
    throw getErr('getMigration: invalid migration file name', { filename });
  }

  // eslint-disable-next-line import/no-dynamic-require, unicorn/prefer-module
  const file = require(`../../../../../app/server/migrations/${filename}`);
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
  return allMigrations.reverse().find(m => m < filename) ?? '1000-00-00_000000.ts';
}

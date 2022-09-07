import cluster from 'cluster';
import semver from 'semver';

import knexRR from 'services/knex/knexRR';

const PG_EXTENSIONS = {
  postgis: '3.2.1',
  tsm_system_rows: '1.0.0',
};

export default async function initCheckPgExtensions() {
  if (!cluster.isMaster) {
    return;
  }

  const rows = await knexRR
    .select(['extname', 'extversion'])
    .from('pg_extension');
  const missing = new Set(Object.keys(PG_EXTENSIONS));
  for (const row of rows) {
    if (!missing.has(row.extname)) {
      continue;
    }
    missing.delete(row.extname);
    const expectedVer = PG_EXTENSIONS[row.extname as keyof typeof PG_EXTENSIONS];
    if (semver.lt(
      TS.notNull(semver.coerce(row.extversion)),
      expectedVer,
    )) {
      throw new Error(`initCheckPgExtensions: ${row.extname} ${row.extversion} < ${expectedVer}`);
    }
  }

  if (missing.size) {
    throw new Error(`initCheckPgExtensions: missing ${[...missing].join(', ')}`);
  }
}

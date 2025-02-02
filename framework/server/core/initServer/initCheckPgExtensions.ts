import semver from 'semver';

import { HAS_MVS } from 'config/__generated__/consts';
import knexBT from 'services/knex/knexBT';
import knexRR from 'services/knex/knexRR';
import isPrimaryServer from 'utils/isPrimaryServer';

const PG_EXTENSIONS = {
  postgis: '3.2.1',
  tsm_system_rows: '1.0.0',
};

export default async function initCheckPgExtensions() {
  if (!isPrimaryServer) {
    return;
  }

  const knex = HAS_MVS ? knexRR : knexBT;
  const rows = await knex<{ extname: string, extversion: string }>('pg_extension')
    .select(['extname', 'extversion']);
  const missing = new Set(Object.keys(PG_EXTENSIONS));
  for (const row of rows) {
    if (!missing.has(row.extname)) {
      continue;
    }
    missing.delete(row.extname);
    const parsedVer = semver.coerce(row.extversion);
    const expectedVer = PG_EXTENSIONS[row.extname as keyof typeof PG_EXTENSIONS];
    if (!parsedVer || semver.lt(
      parsedVer,
      expectedVer,
    )) {
      throw new Error(`initCheckPgExtensions: ${row.extname} ${row.extversion} < ${expectedVer}`);
    }
  }

  if (missing.size) {
    throw new Error(`initCheckPgExtensions: missing ${[...missing].join(', ')}`);
  }
}

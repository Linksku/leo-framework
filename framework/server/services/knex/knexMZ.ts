import Knex from 'knex';

import { HTTP_TIMEOUT } from 'settings';
import './initKnex';

if (!process.env.MZ_USER) {
  throw new Error('MZ_USER env var not set.');
}

const knexMZ = Knex<any, any[]>({
  client: 'pg',
  connection: {
    host: process.env.MZ_HOST,
    port: TS.parseIntOrNull(process.env.MZ_PORT) ?? undefined,
    user: process.env.MZ_USER,
    password: process.env.MZ_PASS,
    database: process.env.MZ_DB,
    charset: 'utf8',
    timezone: 'utc',
    dateStrings: true,
  },
  pool: {
    min: 0,
    max: 10,
  },
  acquireConnectionTimeout: HTTP_TIMEOUT / 2,
  debug: !process.env.PRODUCTION,
  log: {
    debug({
      sql,
      bindings,
    }: {
      sql?: string,
      bindings: any,
    }) {
      const rc = getRC();
      if (process.env.PRODUCTION
        || process.env.IS_SERVER_SCRIPT
        || !sql
        || sql.startsWith('explain ')
        || !sql.startsWith('select ')
        || rc?.profiling) {
        return;
      }

      if (rc?.debug) {
        printDebug(
          rc ? `Query MZ ${rc.path}` : 'Query MZ',
          'success',
          knexMZ.raw(sql, bindings).toString(),
        );
      }
    },
  },
});

export default knexMZ;

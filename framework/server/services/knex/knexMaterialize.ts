import Knex from 'knex';

import { HTTP_TIMEOUT } from 'settings';
import './initKnex';

if (!process.env.MATERIALIZE_USER) {
  throw new Error('MATERIALIZE_USER env var not set.');
}

const knexMaterialize = Knex({
  client: 'pg',
  connection: {
    host: process.env.MATERIALIZE_HOST,
    port: TS.parseIntOrNull(process.env.MATERIALIZE_PORT) ?? undefined,
    user: process.env.MATERIALIZE_USER,
    password: process.env.MATERIALIZE_PASS,
    database: process.env.MATERIALIZE_DB,
    charset: 'utf8',
    timezone: 'utc',
    dateStrings: true,
  },
  pool: {
    min: 0,
    max: 10,
  },
  acquireConnectionTimeout: HTTP_TIMEOUT / 2,
  debug: process.env.NODE_ENV !== 'production',
  log: {
    debug({
      sql,
      bindings,
    }: {
      sql?: string,
      bindings: any,
    }) {
      const rc = getRC();
      if (process.env.NODE_ENV === 'production'
        || process.env.IS_SERVER_SCRIPT
        || !sql
        || sql.startsWith('explain ')
        || !sql.startsWith('select ')
        || rc?.profiling) {
        return;
      }

      if (rc?.debug) {
        printDebug(
          rc ? `Query ${rc.path}` : 'Query',
          'success',
          knexMaterialize.raw(sql, bindings).toString(),
        );
      }
    },
  },
});

// eslint-disable-next-line prefer-destructuring
export const raw = knexMaterialize.raw.bind(knexMaterialize);

export default knexMaterialize;

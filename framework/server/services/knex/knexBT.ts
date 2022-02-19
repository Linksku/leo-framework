import Knex from 'knex';

import { HTTP_TIMEOUT } from 'settings';
import './initKnex';

if (!process.env.POSTGRES_USER) {
  throw new Error('POSTGRES_USER env var not set.');
}

// todo: high/hard add at least 1 mysql local read replica
const knexBT = Knex({
  client: 'pg',
  connection: {
    host: process.env.POSTGRES_HOST,
    port: TS.parseIntOrNull(process.env.POSTGRES_PORT) ?? undefined,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASS,
    database: process.env.POSTGRES_DB,
    charset: 'utf8',
    timezone: 'utc',
    dateStrings: true,
  },
  searchPath: process.env.POSTGRES_DB,
  pool: {
    min: 0,
    max: 10,
    afterCreate(connection: any, callback: AnyFunction) {
      connection.query('SET TIME ZONE \'UTC\'', (err: Error) => {
        callback(err, connection);
      });
    },
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
          knexBT.raw(sql, bindings).toString(),
        );
      }

      // todo: mid/mid make explain statements work for postgres
      /*
      void knex.raw(`explain ${sql}`, bindings)
        .then(results => {
          const filesorts = results[0].filter(
            (row: any) => row.Extra?.toLowerCase().includes('filesort'),
          );
          if (filesorts.length) {
            printDebug(
              rc ? `Filesort ${rc.path}:` : 'Filesort:',
              'error',
              knex.raw(sql, bindings).toString(),
            );
          }

          const temporaries = results[0].filter(
            (row: any) => row.Extra?.toLowerCase().includes('temporary'),
          );
          if (!sql.startsWith('select distinct ') && temporaries.length) {
            printDebug(
              rc ? `Using temporary ${rc.path}:` : 'Using temporary:',
              'error',
              knex.raw(sql, bindings).toString(),
            );
          }
        });
      */
    },
  },
});

export default knexBT;

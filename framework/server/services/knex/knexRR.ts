import Knex from 'knex';

import { HTTP_TIMEOUT } from 'settings';
import './initKnex';

if (!process.env.PG_RR_USER) {
  throw new Error('PG_RR_USER env var not set.');
}

// RR = read replica
const knexRR = Knex<any, any[]>({
  client: 'pg',
  connection: {
    host: process.env.PG_RR_HOST,
    port: TS.parseIntOrNull(process.env.PG_RR_PORT) ?? undefined,
    user: process.env.PG_RR_USER,
    password: process.env.PG_RR_PASS,
    database: process.env.PG_RR_DB,
    charset: 'utf8',
    timezone: 'utc',
    dateStrings: true,
  },
  searchPath: [TS.defined(process.env.PG_RR_SCHEMA)],
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
          rc ? `RR Query ${rc.path}` : 'RR Query',
          'success',
          knexRR.raw(sql, bindings).toString(),
        );

        void knexRR.raw(`explain analyze ${sql}`, bindings)
          .then(
            results => {
              const rows = TS.assertType<{ 'QUERY PLAN': string }[]>(
                val => Array.isArray(val) && val.every(r => r['QUERY PLAN']),
                results.rows,
              );
              const plan = rows.map(r => r['QUERY PLAN']).join('\n');
              const matches = plan.match(/Execution Time: (\d+\.\d+) ms/);
              const execTime = matches ? Number.parseFloat(matches[1]) : 0;
              if (execTime > 10) {
                printDebug(
                  rc ? `Slow RR Query ${rc.path}` : 'Slow RR Query',
                  'error',
                  plan,
                );
              }
            },
            () => {},
          );
      }
    },
  },
});

// eslint-disable-next-line prefer-destructuring
export const raw = knexRR.raw.bind(knexRR);

export default knexRR;

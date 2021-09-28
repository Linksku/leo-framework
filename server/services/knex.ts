import type { TypeCast } from 'mysql';
import Knex from 'knex';

import { DEBUG, HTTP_TIMEOUT } from 'settings';

if (!process.env.MYSQL_USER) {
  throw new Error('MYSQL_USER env var not set.');
}

// todo: high/hard add at least 1 mysql local read replica
const knex = Knex({
  client: 'mysql',
  connection: {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASS,
    database: process.env.MYSQL_DB,
    charset: 'utf8mb4',
    // https://github.com/Vincit/objection.js/issues/174
    typeCast: ((field, next) => {
      if (field.type === 'TINY' && field.length === 1) {
        const value = field.string();
        return value ? value === '1' : null;
      }
      return next();
    }) as TypeCast,
  },
  pool: { min: 0, max: 10 },
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
      if (process.env.NODE_ENV === 'production' || !sql || sql.startsWith('explain ')) {
        return;
      }

      if (DEBUG) {
        console.log(
          'Query:',
          knex.raw(sql, bindings).toString(),
        );
      }

      void knex.raw(`explain ${sql}`, bindings)
        .then(results => {
          if (sql.includes('computedPostsScores')) {
            return;
          }

          const filesorts = results[0].filter(
            (row: any) => row.Extra?.toLowerCase().includes('filesort'),
          );
          if (filesorts.length) {
            console.log(
              'Filesort:',
              knex.raw(sql, bindings).toString(),
            );
          }

          const temporaries = results[0].filter(
            (row: any) => row.Extra?.toLowerCase().includes('temporary'),
          );
          if (!sql.startsWith('select distinct ') && temporaries.length) {
            console.log(
              'Using temporary:',
              knex.raw(sql, bindings).toString(),
            );
          }
        });
    },
  },
});

Model.knex(knex);

// eslint-disable-next-line prefer-destructuring
export const raw = knex.raw.bind(knex);

export default knex;

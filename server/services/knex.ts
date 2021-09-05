import type { TypeCast } from 'mysql';
import Knex from 'knex';

if (!process.env.MYSQL_USER) {
  throw new Error('MYSQL_USER env var not set.');
}

const DEBUG = false;

// todo: high/hard add at least 1 mysql local read replica
const knex = Knex({
  client: 'mysql',
  connection: {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASS,
    database: process.env.MYSQL_DB,
    charset: 'utf8mb4',
    // todo: low/mid figure out why field.length isn't 1 for mysql
    // https://github.com/Vincit/objection.js/issues/174
    typeCast: ((field, next) => {
      if (field.type === 'TINY') {
        const value = field.string();
        return value ? value === '1' : null;
      }
      return next();
    }) as TypeCast,
  },
  pool: { min: 0, max: 10 },
  debug: process.env.NODE_ENV !== 'production',
  log: {
    debug(msg) {
      if (msg.sql.startsWith('explain ')) {
        return;
      }

      if (DEBUG) {
        console.log(
          'Query:',
          knex.raw(msg.sql, msg.bindings).toString(),
        );
      }

      void knex.raw(`explain ${msg.sql}`, msg.bindings)
        .then(results => {
          const slowQueries = results[0].filter(
            row => !msg.sql.includes('computedPostsScores')
                && row.Extra?.toLowerCase().includes('filesort')
                && row.Extra?.toLowerCase().includes('temporary'),
          );
          if (slowQueries.length) {
            console.log(
              'Filesort:',
              knex.raw(msg.sql, msg.bindings).toString(),
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

import Knex from 'knex';
import pg from 'pg';

import { API_TIMEOUT } from 'settings';
import { PG_RR_HOST, PG_RR_PORT, PG_RR_SCHEMA } from 'consts/infra';
import ServiceContextLocalStorage, { createServiceContext } from 'services/ServiceContextLocalStorage';
import './initKnex';
import beforeQuery from './beforeQuery';

if (!process.env.PG_RR_USER) {
  throw new Error('knexRR: PG_RR_USER env var not set.');
}

// RR = read replica
const knexRR = ServiceContextLocalStorage.run(
  createServiceContext('knexRR'),
  () => Knex<any, any[]>({
    client: 'pg',
    connection: {
      host: PG_RR_HOST,
      port: PG_RR_PORT,
      user: process.env.PG_RR_USER,
      password: process.env.PG_RR_PASS,
      database: process.env.PG_RR_DB,
      charset: 'utf8',
      timezone: 'utc',
      dateStrings: true,
    },
    searchPath: PG_RR_SCHEMA,
    pool: {
      min: 0,
      max: process.env.IS_SERVER_SCRIPT ? 10 : 5,
      idleTimeoutMillis: 60 * 1000,
      afterCreate(conn: unknown, cb: AnyFunction) {
        if (!(conn instanceof pg.Client)) {
          throw new TypeError('Client isn\'t PG');
        }

        conn.on('error', err => ServiceContextLocalStorage.run(
          createServiceContext('knexRR'),
          async () => {
            if (err.message.includes('terminating connection due to administrator command')) {
              await ErrorLogger.fatal(err, { ctx: 'Error from PG RR' });
            }
            if (!err.message.includes('Connection terminated unexpectedly')) {
              ErrorLogger.error(err, { ctx: 'Error from PG RR' });
            }
          },
        ));

        conn.query('SET TIME ZONE \'UTC\'', (err: Error) => {
          cb(err, conn);
        });
      },
    },
    acquireConnectionTimeout: process.env.IS_SERVER_SCRIPT ? 60 * 1000 : API_TIMEOUT / 2,
    debug: !process.env.PRODUCTION,
    log: {
      debug({
        sql,
        bindings,
      }: {
        sql?: string,
        bindings: any,
      }) {
        beforeQuery({
          db: 'rr',
          knex: knexRR,
          sql,
          bindings,
        });
      },
      warn(msg: any) {
        if (typeof msg !== 'string' || !msg.startsWith('Connection Error: KnexTimeoutError:')) {
          printDebug(msg, 'warn', { ctx: 'knexRR' });
        }
      },
    },
  }),
);

// eslint-disable-next-line prefer-destructuring
export const raw = knexRR.raw.bind(knexRR);

export default knexRR;

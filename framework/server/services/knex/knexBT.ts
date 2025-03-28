import Knex from 'knex';
import pg from 'pg';

import { DEFAULT_API_TIMEOUT } from 'consts/server';
import {
  PG_BT_HOST,
  PG_BT_PORT,
  PG_BT_DB,
  PG_BT_SCHEMA,
  PG_BT_POOL_MAX,
} from 'consts/infra';
import ServiceContextLocalStorage, { createServiceContext } from 'services/ServiceContextLocalStorage';
import './initKnex';
import beforeQuery from './beforeQuery';

if (!process.env.PG_BT_USER) {
  throw new Error('knexBT: PG_BT_USER env var not set.');
}

if (!process.env.PG_BT_PASS) {
  throw new Error('knexBT: PG_BT_PASS env var not set.');
}

// BT = base table, aka master
const knexBT = ServiceContextLocalStorage.run(
  createServiceContext('knexBT'),
  () => Knex<any, any[]>({
    client: 'pg',
    connection: {
      host: PG_BT_HOST,
      port: PG_BT_PORT,
      user: process.env.PG_BT_USER,
      password: process.env.PG_BT_PASS,
      database: PG_BT_DB,
      charset: 'utf8',
      timezone: 'utc',
      dateStrings: true,
    },
    searchPath: PG_BT_SCHEMA,
    pool: {
      min: 0,
      max: process.env.IS_SERVER_SCRIPT ? PG_BT_POOL_MAX * 2 : PG_BT_POOL_MAX,
      idleTimeoutMillis: 60 * 1000,
      afterCreate(conn: unknown, cb: AnyFunction) {
        if (!(conn instanceof pg.Client)) {
          throw new TypeError('Client isn\'t PG');
        }

        conn.on('error', err => ServiceContextLocalStorage.run(
          createServiceContext('knexBT'),
          async () => {
            if (err.message.includes('terminating connection due to administrator command')) {
              await ErrorLogger.fatal(err, { ctx: 'Error from PG BT' });
            }
            if (!err.message.includes('Connection terminated unexpectedly')) {
              ErrorLogger.error(err, { ctx: 'Error from PG BT' });
            }
          },
        ));

        conn.query('SET TIME ZONE \'UTC\'', (err: Error) => {
          cb(err, conn);
        });
      },
    },
    acquireConnectionTimeout: process.env.IS_SERVER_SCRIPT ? 60 * 1000 : DEFAULT_API_TIMEOUT / 2,
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
          db: 'bt',
          knex: knexBT,
          sql,
          bindings,
        });
      },
      warn(msg: any) {
        if (typeof msg !== 'string' || !msg.startsWith('Connection Error: KnexTimeoutError:')) {
          printDebug(msg, 'warn', { ctx: 'knexBT' });
        }
      },
    },
  }),
);

export default knexBT;

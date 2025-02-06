import Knex from 'knex';
import pg from 'pg';

import {
  MZ_HOST,
  MZ_PORT,
  MZ_DB,
  MZ_POOL_MAX,
} from 'consts/infra';
import { MZ_QUERY_TIMEOUT } from 'consts/mz';
import ServiceContextLocalStorage, { createServiceContext } from 'services/ServiceContextLocalStorage';
import './initKnex';
import beforeQuery from './beforeQuery';

if (!process.env.MZ_USER) {
  throw new Error('knexMZ: MZ_USER env var not set.');
}

const knexMZ = ServiceContextLocalStorage.run(
  createServiceContext('knexMZ'),
  () => Knex<any, any[]>({
    client: 'pg',
    connection: {
      host: MZ_HOST,
      port: MZ_PORT,
      user: process.env.MZ_USER,
      password: process.env.MZ_PASS,
      database: MZ_DB,
      charset: 'utf8',
      timezone: 'utc',
      dateStrings: true,
      query_timeout: MZ_QUERY_TIMEOUT,
    },
    pool: {
      min: 0,
      max: process.env.IS_SERVER_SCRIPT ? MZ_POOL_MAX * 2 : MZ_POOL_MAX,
      idleTimeoutMillis: 60 * 1000,
      afterCreate(conn: unknown, cb: AnyFunction) {
        if (!(conn instanceof pg.Client)) {
          throw new TypeError('Client isn\'t PG');
        }

        conn.on('error', err => ServiceContextLocalStorage.run(
          createServiceContext('knexMZ'),
          () => {
            if (!err.message.includes('Connection terminated unexpectedly')) {
              ErrorLogger.error(err, { ctx: 'Unexpected error on idle MZ client' });
            }
          },
        ));

        cb(null, conn);
      },
    },
    acquireConnectionTimeout: 60 * 1000,
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
          db: 'mz',
          knex: knexMZ,
          sql,
          bindings,
        });
      },
      warn(msg: any) {
        if (typeof msg !== 'string' || (
          !msg.startsWith('Connection Error: KnexTimeoutError:')
            && !msg.startsWith('Connection Error: Connection ended unexpectedly'))) {
          printDebug(msg, 'warn', { ctx: 'knexMZ' });
        }
      },
    },
  }),
);

export default knexMZ;

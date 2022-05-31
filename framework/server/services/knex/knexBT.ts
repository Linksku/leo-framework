import Knex from 'knex';

import { HTTP_TIMEOUT } from 'settings';
import './initKnex';

if (!process.env.PG_BT_USER) {
  throw new Error('PG_BT_USER env var not set.');
}

/*
Postgres config:
listen_addresses = '*'
wal_level = logical
wal_writer_delay = 10ms
max_wal_senders = 100
max_replication_slots = 100

pg_hba:
host  all  all  0.0.0.0/0  scram-sha-256
*/

// BT = base table, aka master
const knexBT = Knex<any, any[]>({
  client: 'pg',
  connection: {
    host: process.env.PG_BT_HOST,
    port: TS.parseIntOrNull(process.env.PG_BT_PORT) ?? undefined,
    user: process.env.PG_BT_USER,
    password: process.env.PG_BT_PASS,
    database: process.env.PG_BT_DB,
    charset: 'utf8',
    timezone: 'utc',
    dateStrings: true,
  },
  searchPath: process.env.PG_BT_SCHEMA,
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
          rc ? `Query BT ${rc.path}` : 'Query BT',
          'success',
          knexBT.raw(sql, bindings).toString(),
        );
      }
    },
  },
});

export default knexBT;

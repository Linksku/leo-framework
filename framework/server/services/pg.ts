import pg from 'pg';

import { PG_BT_HOST, PG_BT_PORT, PG_BT_DB } from 'consts/infra';
import ServiceContextLocalStorage, { createServiceContext } from 'services/ServiceContextLocalStorage';

if (!process.env.PG_BT_USER || !process.env.PG_BT_PASS) {
  throw new Error('pg: env vars not set');
}

export default ServiceContextLocalStorage.run(
  createServiceContext('pg'),
  () => {
    const client = new pg.Client({
      host: PG_BT_HOST,
      port: PG_BT_PORT,
      user: process.env.PG_BT_USER,
      password: process.env.PG_BT_PASS,
      database: PG_BT_DB,
    });

    client.on('error', err => {
      ErrorLogger.error(err, { ctx: 'Unexpected error on idle PG client' });
    });

    return client;
  },
);

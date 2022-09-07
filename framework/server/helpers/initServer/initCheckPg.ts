import cluster from 'cluster';

import knexBT from 'services/knex/knexBT';
import knexRR from 'services/knex/knexRR';

export default async function initCheckPg() {
  if (!cluster.isMaster) {
    return;
  }

  await Promise.all([
    (async () => {
      try {
        await knexBT.raw('select 1 from pg_tables limit 1');
      } catch {
        throw new Error('Base PG connection failed');
      }
    })(),
    (async () => {
      try {
        await knexRR.raw('select 1 from pg_tables limit 1');
      } catch {
        throw new Error('Replica PG connection failed');
      }
    })(),
  ]);
}

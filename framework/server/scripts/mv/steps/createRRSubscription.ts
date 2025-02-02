import createBTReplicationSlot from 'utils/infra/createBTReplicationSlot';
import { RR_SUB_ALL_TABLES, BT_PUB_ALL_TABLES, BT_SLOT_RR } from 'consts/mz';
import knexRR from 'services/knex/knexRR';
import { PG_BT_HOST, PG_BT_PORT, PG_BT_DB } from 'consts/infra';
import EntityModels from 'core/models/allEntityModels';
import { HAS_MVS } from 'config/__generated__/consts';

export default async function createRRSubscription() {
  if (!EntityModels.length || !HAS_MVS) {
    printDebug('No RR subscriptions needed', 'highlight');
    return;
  }

  printDebug('Creating RR subscription', 'highlight');
  const startTime = performance.now();
  await createBTReplicationSlot(BT_SLOT_RR);

  const result = await knexRR<{ subname: string }>('pg_subscription')
    .select(raw('1'))
    .where({ subname: RR_SUB_ALL_TABLES });
  if (!result.length) {
    printDebug('Creating RR subscription', 'highlight');
    await knexRR.raw(`
      CREATE SUBSCRIPTION "${RR_SUB_ALL_TABLES}"
      CONNECTION 'host=${PG_BT_HOST} port=${PG_BT_PORT} user=${process.env.PG_BT_USER} password=${process.env.PG_BT_PASS} dbname=${PG_BT_DB}'
      PUBLICATION "${BT_PUB_ALL_TABLES}"
      WITH (
        create_slot = false,
        slot_name = '${BT_SLOT_RR}'
      )
    `);
  }
  printDebug(
    `Created RR subscription after ${Math.round((performance.now() - startTime) / 100) / 10}s`,
    'success',
  );
}

import createBTReplicationSlot from 'utils/infra/createBTReplicationSlot';
import { RR_SUB_ALL_TABLES, BT_PUB_ALL_TABLES, BT_SLOT_RR } from 'consts/mz';
import knexRR from 'services/knex/knexRR';

export default async function createRRSubscription() {
  await createBTReplicationSlot(BT_SLOT_RR);

  const result = await knexRR('pg_subscription')
    .select(raw('1'))
    .where('subname', RR_SUB_ALL_TABLES);
  if (!result.length) {
    printDebug('Creating replica subscriptions', 'highlight');
    await knexRR.raw(`
      CREATE SUBSCRIPTION "${RR_SUB_ALL_TABLES}"
      CONNECTION 'host=${process.env.PG_BT_HOST} port=${process.env.PG_BT_PORT} user=${process.env.PG_BT_USER} password=${process.env.PG_BT_PASS} dbname=${process.env.PG_BT_DB}'
      PUBLICATION "${BT_PUB_ALL_TABLES}"
      WITH (
        create_slot = false,
        slot_name = '${BT_SLOT_RR}'
      )
    `);
  }
}

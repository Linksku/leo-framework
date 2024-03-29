import deleteBTReplicationSlot from 'utils/infra/deleteBTReplicationSlot';
import deleteRRSubscription from 'utils/infra/deleteRRSubscription';
import { RR_SUB_ALL_TABLES, BT_SLOT_RR } from 'consts/mz';
import knexRR from 'services/knex/knexRR';

export default async function deleteRRSubscriptions() {
  printDebug('Deleting replica subscription', 'highlight');
  await deleteRRSubscription(RR_SUB_ALL_TABLES);
  await deleteBTReplicationSlot(BT_SLOT_RR);

  const remainingSubs = await knexRR<{ subname: string }>('pg_subscription')
    .select('subname');
  if (remainingSubs.length) {
    throw getErr(
      'deleteRRSubscriptions: subscriptions remaining',
      { slots: remainingSubs.map(row => row.subname) },
    );
  }
}

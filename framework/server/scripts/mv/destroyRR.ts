import initInfraWrap from 'utils/infra/initInfraWrap';
import { HAS_MVS } from 'config/__generated__/consts';
import deleteBTReplicationSlot from 'utils/infra/deleteBTReplicationSlot';
import deleteRRSubscription from 'utils/infra/deleteRRSubscription';
import { RR_SUB_ALL_TABLES, BT_SLOT_RR } from 'consts/mz';
import knexRR from 'services/knex/knexRR';
import deleteRRData from './steps/deleteRRData';

async function deleteRRSubscriptions() {
  printDebug('Deleting RR subscription', 'highlight');
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

export default function destroyRR() {
  if (!HAS_MVS) {
    return undefined;
  }

  return initInfraWrap(async () => {
    await withErrCtx(deleteRRSubscriptions(), 'destroyRR: deleteRRSubscriptions');
    await withErrCtx(deleteRRData(), 'destroyRR: deleteRRData');
  });
}

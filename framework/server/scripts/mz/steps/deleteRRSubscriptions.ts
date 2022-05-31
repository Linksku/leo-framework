import deleteBTReplicationSlot from 'utils/infra/deleteBTReplicationSlot';
import deleteRRSubscription from 'utils/infra/deleteRRSubscription';
import { RR_SUB_ALL_TABLES, BT_SLOT_RR } from 'consts/mz';

export default async function deleteRRSubscriptions() {
  printDebug(`Deleting replica subscription`, 'highlight');
  await deleteRRSubscription(RR_SUB_ALL_TABLES);

  await deleteBTReplicationSlot(BT_SLOT_RR);
}

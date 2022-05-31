import createBTReplicationSlot from 'utils/infra/createBTReplicationSlot';
import { RR_SUB_ALL_TABLES, BT_PUB_ALL_TABLES, BT_SLOT_RR } from 'consts/mz';
import createRRSubscription from './helpers/createRRSubscription';

export default async function initRR() {
  await createBTReplicationSlot(BT_SLOT_RR);

  printDebug(`Creating replica subscriptions`, 'highlight');
  await createRRSubscription(RR_SUB_ALL_TABLES, BT_PUB_ALL_TABLES, BT_SLOT_RR);
}

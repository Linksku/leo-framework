import createBTReplicationSlot from 'utils/infra/createBTReplicationSlot';
import { BT_SLOT_DBZ_UPDATEABLE, BT_SLOT_DBZ_INSERT_ONLY } from 'consts/mz';

export default async function createDBZReplicationSlots() {
  const startTime = performance.now();
  await createBTReplicationSlot(BT_SLOT_DBZ_UPDATEABLE);
  await createBTReplicationSlot(BT_SLOT_DBZ_INSERT_ONLY);
  printDebug(
    `Created DBZ replication slots after ${Math.round((performance.now() - startTime) / 100) / 10}s`,
    'success',
  );
}

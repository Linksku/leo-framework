import createBTReplicationSlot from 'utils/infra/createBTReplicationSlot';
import {
  BT_SLOT_DBZ_UPDATEABLE,
  BT_SLOT_DBZ_INSERT_ONLY,
  DBZ_FOR_UPDATEABLE,
  DBZ_FOR_INSERT_ONLY,
} from 'consts/mz';

export default async function createDBZReplicationSlots() {
  if (!DBZ_FOR_UPDATEABLE && !DBZ_FOR_INSERT_ONLY) {
    return;
  }

  printDebug('Creating DBZ replication slots', 'highlight');
  const startTime = performance.now();
  await Promise.all([
    DBZ_FOR_UPDATEABLE && createBTReplicationSlot(BT_SLOT_DBZ_UPDATEABLE),
    DBZ_FOR_INSERT_ONLY && createBTReplicationSlot(BT_SLOT_DBZ_INSERT_ONLY),
  ]);
  printDebug(
    `Created DBZ replication slots after ${Math.round((performance.now() - startTime) / 100) / 10}s`,
    'success',
  );
}

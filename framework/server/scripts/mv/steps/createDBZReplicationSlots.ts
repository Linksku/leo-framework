import createBTReplicationSlot from 'utils/infra/createBTReplicationSlot';
import {
  BT_SLOT_DBZ_UPDATEABLE,
  BT_SLOT_DBZ_INSERT_ONLY,
  DBZ_FOR_UPDATEABLE,
  DBZ_FOR_INSERT_ONLY,
} from 'consts/mz';
import EntityModels from 'core/models/allEntityModels';
import { HAS_MVS } from 'config/__generated__/consts';

export default async function createDBZReplicationSlots() {
  if (!DBZ_FOR_UPDATEABLE && !DBZ_FOR_INSERT_ONLY) {
    return;
  }
  if (!EntityModels.length || !HAS_MVS) {
    printDebug('No replication slots needed', 'highlight');
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

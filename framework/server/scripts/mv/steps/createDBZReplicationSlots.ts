import createBTReplicationSlot from 'utils/infra/createBTReplicationSlot';
import { BT_SLOT_DBZ_ALL_TABLES, BT_SLOT_DBZ_INSERT_ONLY } from 'consts/mz';

export default async function createDBZReplicationSlots() {
  await createBTReplicationSlot(BT_SLOT_DBZ_ALL_TABLES);
  await createBTReplicationSlot(BT_SLOT_DBZ_INSERT_ONLY);
}

import deleteBTReplicationSlot from 'utils/infra/deleteBTReplicationSlot';
import { BT_SLOT_DBZ_ALL_TABLES, BT_SLOT_DBZ_INSERT_ONLY } from 'consts/mz';

export default async function deleteDBZReplicationSlots() {
  await deleteBTReplicationSlot(BT_SLOT_DBZ_ALL_TABLES);
  await deleteBTReplicationSlot(BT_SLOT_DBZ_INSERT_ONLY);
}

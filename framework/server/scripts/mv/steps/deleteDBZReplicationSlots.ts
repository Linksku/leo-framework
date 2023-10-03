import deleteBTReplicationSlot from 'utils/infra/deleteBTReplicationSlot';
import { BT_SLOT_DBZ_UPDATEABLE, BT_SLOT_DBZ_INSERT_ONLY, BT_CDC_SLOT_PREFIX } from 'consts/mz';
import knexBT from 'services/knex/knexBT';

export default async function deleteDBZReplicationSlots() {
  const existingSlots = await knexBT<{ slot_name: string }>('pg_replication_slots')
    .select('slot_name');
  await Promise.all([
    deleteBTReplicationSlot(BT_SLOT_DBZ_UPDATEABLE),
    deleteBTReplicationSlot(BT_SLOT_DBZ_INSERT_ONLY),
    ...existingSlots
      .filter(slot => slot.slot_name.startsWith(BT_CDC_SLOT_PREFIX))
      .map(slot => deleteBTReplicationSlot(slot.slot_name)),
  ]);

  const remainingSlots = await knexBT<{ slot_name: string }>('pg_replication_slots')
    .select('slot_name');
  if (remainingSlots.length) {
    throw getErr(
      'deleteDBZReplicationSlots: replication slots remaining',
      { slots: remainingSlots.map(row => row.slot_name) },
    );
  }
}

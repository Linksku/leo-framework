import throttledPromiseAll from 'utils/throttledPromiseAll';
import deleteBTReplicationSlot from 'utils/infra/deleteBTReplicationSlot';
import {
  BT_SLOT_DBZ_UPDATEABLE,
  BT_SLOT_DBZ_INSERT_ONLY,
  BT_CDC_SLOT_PREFIX,
  BT_SLOT_RR,
} from 'consts/mz';
import knexBT from 'services/knex/knexBT';

export default async function deleteMZReplicationSlots() {
  printDebug('Deleting MZ replication slots', 'highlight');

  const existingSlots = await knexBT<{ slot_name: string }>('pg_replication_slots')
    .select('slot_name');
  const slotsToDelete = [
    BT_SLOT_DBZ_UPDATEABLE,
    BT_SLOT_DBZ_INSERT_ONLY,
    ...existingSlots
      .filter(slot => slot.slot_name.startsWith(BT_CDC_SLOT_PREFIX))
      .map(slot => slot.slot_name),
  ];
  await throttledPromiseAll(
    5,
    slotsToDelete,
    slot => deleteBTReplicationSlot(slot),
  );

  const remainingSlots = await knexBT<{ slot_name: string }>('pg_replication_slots')
    .select('slot_name')
    .whereNot('slot_name', BT_SLOT_RR);
  if (remainingSlots.length) {
    throw getErr(
      'deleteMZReplicationSlots: replication slots remaining',
      { slots: remainingSlots.map(row => row.slot_name) },
    );
  }
}

import deleteBTReplicationSlot from 'utils/infra/deleteBTReplicationSlot';
import { BT_SLOT_DBZ_UPDATEABLE, BT_SLOT_DBZ_INSERT_ONLY } from 'consts/mz';
import knexBT from 'services/knex/knexBT';

export default async function deleteDBZReplicationSlots() {
  await deleteBTReplicationSlot(BT_SLOT_DBZ_UPDATEABLE);
  await deleteBTReplicationSlot(BT_SLOT_DBZ_INSERT_ONLY);

  const remainingSlots = await knexBT('pg_replication_slots')
    .select('slot_name');
  if (remainingSlots.length) {
    throw getErr(
      'deleteDBZReplicationSlots: replication slots remaining',
      { slots: remainingSlots.map(row => row.slot_name) },
    );
  }
}

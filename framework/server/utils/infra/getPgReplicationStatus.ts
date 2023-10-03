import EntityModels from 'services/model/allEntityModels';
import {
  BT_CDC_SLOT_PREFIX,
  BT_PUB_ALL_TABLES,
  BT_SLOT_DBZ_INSERT_ONLY,
  BT_SLOT_DBZ_UPDATEABLE,
  BT_SLOT_RR,
  ENABLE_DBZ,
} from 'consts/mz';
import knexBT from 'services/knex/knexBT';

const DBZ_SLOTS = [
  BT_SLOT_RR,
  BT_SLOT_DBZ_UPDATEABLE,
  BT_SLOT_DBZ_INSERT_ONLY,
];

export default async function getPgReplicationStatus() {
  const { pubRows, slotsRows } = await promiseObj({
    pubRows: knexBT<{ tablename: string, pubname: string }>('pg_publication_tables')
      .select('tablename')
      .where({ pubname: BT_PUB_ALL_TABLES }),
    slotsRows: knexBT<{
      slot_name: string,
      active_pid: string,
      wal_status: string,
    }>('pg_replication_slots')
      .select(['slot_name', 'active_pid', 'wal_status']),
  });

  const existingPubTables: string[] = pubRows.map(row => row.tablename);
  const missingPubTables = EntityModels
    .map(model => model.tableName)
    .filter(model => !existingPubTables.includes(model));
  const extraPubTables = existingPubTables.filter(
    pub => !EntityModels.some(model => model.tableName === pub),
  );

  const existingSlots: string[] = slotsRows.map(row => row.slot_name);
  let missingSlots: string[] = [];
  let extraSlots: string[] = [];
  let extendedSlots: string[] = [];
  let isRRSlotInactive = false;
  if (ENABLE_DBZ) {
    missingSlots = DBZ_SLOTS.filter(slot => !existingSlots.includes(slot));
    extraSlots = existingSlots.filter(slot => !DBZ_SLOTS.includes(slot));
  } else {
    if (!existingSlots.some(slot => slot.startsWith(BT_CDC_SLOT_PREFIX))) {
      missingSlots = [BT_CDC_SLOT_PREFIX];
    }

    extendedSlots = slotsRows
      .filter(
        row => row.wal_status === 'extended'
          && row.slot_name.startsWith(BT_CDC_SLOT_PREFIX),
      )
      .map(row => row.slot_name);
  }

  if (slotsRows.some(row => row.slot_name === BT_SLOT_RR && row.active_pid == null)) {
    isRRSlotInactive = true;
  }

  return {
    missingPubTables,
    extraPubTables,
    missingSlots,
    extraSlots,
    extendedSlots,
    isRRSlotInactive,
  };
}

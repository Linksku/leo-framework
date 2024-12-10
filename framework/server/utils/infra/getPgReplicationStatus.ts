import EntityModels from 'core/models/allEntityModels';
import {
  BT_CDC_SLOT_PREFIX,
  BT_PUB_ALL_TABLES,
  BT_SLOT_DBZ_INSERT_ONLY,
  BT_SLOT_DBZ_UPDATEABLE,
  BT_SLOT_RR,
  DBZ_FOR_INSERT_ONLY,
  DBZ_FOR_UPDATEABLE,
} from 'consts/mz';
import knexBT from 'services/knex/knexBT';

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
  const missingSlots: string[] = [];
  const extraSlots: string[] = [];
  const extendedSlots: string[] = [];
  let isRRSlotInactive = false;

  if (DBZ_FOR_UPDATEABLE && !existingSlots.includes(BT_SLOT_DBZ_UPDATEABLE)) {
    missingSlots.push(BT_SLOT_DBZ_UPDATEABLE);
  }
  if (!DBZ_FOR_UPDATEABLE && existingSlots.includes(BT_SLOT_DBZ_UPDATEABLE)) {
    extraSlots.push(BT_SLOT_DBZ_UPDATEABLE);
  }

  if (DBZ_FOR_INSERT_ONLY && !existingSlots.includes(BT_SLOT_DBZ_INSERT_ONLY)) {
    missingSlots.push(BT_SLOT_DBZ_INSERT_ONLY);
  }
  if (!DBZ_FOR_INSERT_ONLY && existingSlots.includes(BT_SLOT_DBZ_INSERT_ONLY)) {
    extraSlots.push(BT_SLOT_DBZ_INSERT_ONLY);
  }

  if (DBZ_FOR_UPDATEABLE && DBZ_FOR_INSERT_ONLY) {
    const pgSlots = existingSlots.filter(slot => slot.startsWith(BT_CDC_SLOT_PREFIX));
    if (pgSlots) {
      extraSlots.push(...pgSlots);
    }
  } else {
    if (!existingSlots.some(slot => slot.startsWith(BT_CDC_SLOT_PREFIX))) {
      missingSlots.push(BT_CDC_SLOT_PREFIX);
    }

    extendedSlots.push(...slotsRows
      .filter(
        row => row.wal_status === 'extended'
          && row.slot_name.startsWith(BT_CDC_SLOT_PREFIX),
      )
      .map(row => row.slot_name));
  }

  if (!existingSlots.includes(BT_SLOT_RR)) {
    missingSlots.push(BT_SLOT_RR);
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

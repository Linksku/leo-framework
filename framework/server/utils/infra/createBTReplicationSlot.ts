import knexBT from 'services/knex/knexBT';

export default async function createBTReplicationSlot(name: string) {
  printDebug(`Creating slot ${name}`, 'highlight');
  const { rows } = await knexBT.raw(`
    SELECT 1
    FROM pg_replication_slots
    WHERE slot_name = ?
  `, [name]);

  if (!rows.length) {
    await knexBT.raw(`
      SELECT *
      FROM pg_create_logical_replication_slot(?, 'pgoutput', false, false)
    `, [name]);
  }
}

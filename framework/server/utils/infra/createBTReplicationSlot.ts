import knexBT from 'services/knex/knexBT';

export default async function createBTReplicationSlot(name: string) {
  printDebug(`Creating slot ${name}`, 'highlight');
  const result = await knexBT('pg_replication_slots')
    .select(raw('1'))
    .where('slot_name', name);

  if (!result.length) {
    await knexBT.select('*')
      .from(raw('pg_create_logical_replication_slot(?, \'pgoutput\', false, false)', [name]));
  }
}

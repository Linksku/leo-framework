import knexBT from 'services/knex/knexBT';
import retry from 'utils/retry';

export default async function deleteBTReplicationSlot(name: string) {
  printDebug(`Deleting slot ${name}`, 'highlight');

  await retry(
    async () => {
      const { rows: activeSlots } = await knexBT.raw(`
        SELECT slot_name, active_pid
        FROM pg_replication_slots
        WHERE active_pid IS NOT NULL AND slot_name LIKE ?
      `, [name]);
      return !activeSlots.length;
    },
    {
      times: 5,
      interval: 1000,
      timeoutErr: `deleteBTReplicationSlot(${name}): slots are active`,
    },
  );

  /* for (const row of activeSlots) {
    // eslint-disable-next-line no-await-in-loop
    await knexBT.raw(
      'SELECT pg_terminate_backend(?)',
      [row.active_pid],
    );
  } */

  await knexBT.raw(`
    SELECT pg_drop_replication_slot(slot_name)
    FROM pg_replication_slots
    WHERE slot_name LIKE ?
  `, [name]);
}

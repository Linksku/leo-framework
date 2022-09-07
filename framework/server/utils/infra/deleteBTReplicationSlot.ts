import knexBT from 'services/knex/knexBT';
import retry from 'utils/retry';

export default async function deleteBTReplicationSlot(name: string) {
  printDebug(`Deleting slot ${name}`, 'highlight');

  await retry(
    async () => {
      const activeSlots = await knexBT('pg_replication_slots')
        .select(['slot_name', 'active_pid'])
        .whereNotNull('active_pid')
        .whereLike('slot_name', name);
      return !activeSlots.length;
    },
    {
      times: 5,
      interval: 1000,
      err: `deleteBTReplicationSlot(${name}): slots are active`,
    },
  );

  /* for (const row of activeSlots) {
    // eslint-disable-next-line no-await-in-loop
    await knexBT.raw(
      'SELECT pg_terminate_backend(?)',
      [row.active_pid],
    );
  } */

  await knexBT('pg_replication_slots')
    .select(raw('pg_drop_replication_slot(slot_name)'))
    .whereLike('slot_name', name);
}

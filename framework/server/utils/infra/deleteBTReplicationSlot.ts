import knexBT from 'services/knex/knexBT';
import retry from 'utils/retry';

export default async function deleteBTReplicationSlot(name: string) {
  printDebug(`Deleting slot ${name}`, 'highlight');

  await retry(
    async () => {
      const activeSlots = await knexBT<{
        slot_name: string,
        active_pid: number,
      }>('pg_replication_slots')
        .select(['slot_name', 'active_pid'])
        .whereNotNull('active_pid')
        .whereLike('slot_name', name);
      if (activeSlots.length) {
        throw getErr('Replication slots still active', {
          activeSlots: activeSlots.map(row => row.slot_name),
        });
      }
    },
    {
      timeout: 10 * 60 * 1000,
      interval: 1000,
      ctx: `deleteBTReplicationSlot(${name}): wait for slot to be inactive`,
    },
  );

  /* for (const row of activeSlots) {
    // eslint-disable-next-line no-await-in-loop
    await knexBT.raw(
      'SELECT pg_terminate_backend(?)',
      [row.active_pid],
    );
  } */

  await knexBT<{ slot_name: string }>('pg_replication_slots')
    .select(raw('pg_drop_replication_slot(slot_name)'))
    .whereLike('slot_name', name);
}

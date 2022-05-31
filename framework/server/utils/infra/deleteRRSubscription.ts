import knexRR from 'services/knex/knexRR';

export default async function deleteRRSubscription(name: string) {
  const result = await knexRR.raw(
    `SELECT 1 FROM pg_subscription WHERE subname = ?`,
    [name],
  );
  if (result.rows.length) {
    await knexRR.raw(`ALTER SUBSCRIPTION "${name}" DISABLE`);
    await knexRR.raw(`ALTER SUBSCRIPTION "${name}" SET (slot_name = none)`);
    await knexRR.raw(`DROP SUBSCRIPTION "${name}"`);
  }
}

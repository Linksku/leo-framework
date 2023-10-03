import knexRR from 'services/knex/knexRR';

export default async function deleteRRSubscription(name: string) {
  const result = await knexRR<{ subname: string }>('pg_subscription')
    .select(raw('1'))
    .where({ subname: name });
  if (result.length) {
    await knexRR.raw(`ALTER SUBSCRIPTION "${name}" DISABLE`);
    await knexRR.raw(`ALTER SUBSCRIPTION "${name}" SET (slot_name = none)`);
    await knexRR.raw(`DROP SUBSCRIPTION "${name}"`);
  }
}

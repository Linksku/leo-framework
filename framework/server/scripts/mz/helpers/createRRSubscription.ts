import knexRR from 'services/knex/knexRR';

export default async function createRRSubscription(
  name: string,
  publication: string,
  slot: string,
) {
  await knexRR.raw(`
    CREATE SUBSCRIPTION "${name}"
    CONNECTION 'host=${process.env.PG_BT_HOST} port=${process.env.PG_BT_PORT} user=${process.env.PG_BT_USER} password=${process.env.PG_BT_PASS} dbname=${process.env.PG_BT_DB}'
    PUBLICATION "${publication}"
    WITH (
      create_slot = false,
      slot_name = '${slot}'
    )
  `);
}

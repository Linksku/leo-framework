import knexBT from 'services/knex/knexBT';

export default async function reserveNextId(Model: EntityClass) {
  const rows = await knexBT.raw(`SELECT nextval(pg_get_serial_sequence('"${Model.tableName}"', 'id')) id`);
  return TS.assertType<EntityId>(
    val => typeof val === 'number',
    rows.rows[0]?.id,
    new Error(`reserveNextId(${Model.type}): failed to reserve next ID.`),
  );
}

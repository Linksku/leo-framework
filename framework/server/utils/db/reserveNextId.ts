export default async function reserveNextId(Model: EntityClass) {
  const results = await rawSelect(
    `SELECT nextval(pg_get_serial_sequence('"${Model.tableName}"', 'id')) id`,
    { db: 'bt' },
  );
  return TS.assertType<EntityId>(
    results.rows[0]?.id,
    val => typeof val === 'number',
    new Error(`reserveNextId(${Model.type}): failed to reserve next ID.`),
  );
}

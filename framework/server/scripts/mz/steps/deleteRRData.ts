import knexRR from 'services/knex/knexRR';

// todo: mid/mid delete all tables and restore from pgdump
export default async function deleteRRData() {
  printDebug(`Deleting replica data`, 'highlight');
  const allTables = await knexRR.raw(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema='${process.env.PG_RR_SCHEMA}'
      AND table_type='BASE TABLE'
      AND table_name != 'spatial_ref_sys';
  `);
  await knexRR.raw(
    `TRUNCATE ${(allTables.rows as any[]).map(r => `"${r.table_name}"`).join(',')}`,
  );
}

import knexRR from 'services/knex/knexRR';
import { PG_RR_SCHEMA } from 'consts/infra';
import { HAS_MVS } from 'config/__generated__/consts';

export default async function deleteRRData(tables?: string[]) {
  if (!HAS_MVS) {
    return;
  }

  const startTime = performance.now();
  printDebug('Deleting RR data', 'highlight');

  const rows = await knexRR<{
    table_name: string,
    table_schema: string,
    table_type: string,
  }>('information_schema.tables')
    .select('table_name')
    .where({
      table_schema: PG_RR_SCHEMA,
      table_type: 'BASE TABLE',
    })
    .whereNot({ table_name: 'spatial_ref_sys' });
  const existingTables = rows.map(r => r.table_name);

  tables = tables
    ? tables.filter(t => existingTables.includes(t))
    : existingTables;

  if (tables.length) {
    await knexRR.raw(
      `TRUNCATE ${tables.map(t => `"${t}"`).join(',')}`,
    );
  }

  printDebug(
    `Deleted RR data after ${Math.round((performance.now() - startTime) / 100) / 10}s`,
    'success',
  );
}

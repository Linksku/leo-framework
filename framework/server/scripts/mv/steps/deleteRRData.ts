import knexRR from 'services/knex/knexRR';
import { PG_RR_SCHEMA } from 'consts/infra';

export default async function deleteRRData() {
  printDebug('Deleting replica data', 'highlight');
  const rows = await knexRR('information_schema.tables')
    .select('table_name')
    .where({
      table_schema: PG_RR_SCHEMA,
      table_type: 'BASE TABLE',
    })
    .whereNot('table_name', 'spatial_ref_sys');
  if (rows.length) {
    await knexRR.raw(
      `TRUNCATE ${rows.map(r => `"${r.table_name}"`).join(',')}`,
    );
  }
}

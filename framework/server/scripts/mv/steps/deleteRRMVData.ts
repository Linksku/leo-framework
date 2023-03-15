import MaterializedViewModels from 'services/model/allMaterializedViewModels';
import knexRR from 'services/knex/knexRR';
import { PG_RR_SCHEMA } from 'consts/infra';

export default async function deleteRRMVData() {
  const startTime = performance.now();
  printDebug('Deleting replica MV data', 'highlight');
  const rows = await knexRR('information_schema.tables')
    .select('table_name')
    .where({
      table_schema: PG_RR_SCHEMA,
      table_type: 'BASE TABLE',
    })
    .whereIn('table_name', MaterializedViewModels.map(r => r.tableName));
  if (rows.length) {
    await knexRR.raw(
      `TRUNCATE ${rows.map(r => `"${r.table_name}"`).join(',')}`,
    );
  }

  printDebug(`Deleted RR data after ${Math.round((performance.now() - startTime) / 100) / 10}s`, 'success');
}

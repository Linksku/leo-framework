import pLimit from 'p-limit';

import MaterializedViewModels from 'services/model/allMaterializedViewModels';
import retry from 'utils/retry';

const limiter = pLimit(5);

export default async function waitForRRTablesData() {
  printDebug('Waiting for RR tables to have data', 'highlight');
  const startTime = performance.now();

  const remainingTables = new Set(
    MaterializedViewModels
      .filter(model => model.getReplicaTable()),
  );
  const tablesMissingData = new Set<ModelType>();
  await retry(
    async () => {
      await Promise.all([...remainingTables].map(model => limiter(async () => {
        const hasMZRows = tablesMissingData.has(model.type);
        if (!hasMZRows) {
          const results = await rawSelect('mz', 'SELECT 1 FROM ?? LIMIT 1 AS OF now()', [model.tableName]);

          if (!results.rows.length) {
            remainingTables.delete(model);
            return;
          }
        }

        const results = await rawSelect('rr', 'SELECT 1 FROM ?? LIMIT 1', [model.tableName]);
        if (results.rows.length) {
          tablesMissingData.delete(model.type);
          remainingTables.delete(model);
        } else {
          tablesMissingData.add(model.type);
        }
      })));
      if (tablesMissingData.size) {
        throw getErr('RR tables are empty', { tables: [...tablesMissingData] });
      }
    },
    {
      timeout: 10 * 60 * 1000,
      interval: 1000,
      ctx: 'waitForRRTables',
    },
  );

  printDebug(`RR has data after ${Math.round((performance.now() - startTime) / 100) / 10}s`, 'success');
}

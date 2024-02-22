import throttledPromiseAll from 'utils/throttledPromiseAll';
import MaterializedViewModels from 'services/model/allMaterializedViewModels';
import retry from 'utils/retry';
import { DBZ_FOR_INSERT_ONLY, DBZ_FOR_UPDATEABLE } from 'consts/mz';
import verifyMZSinkConnectors from '../helpers/verifyMZSinkConnectors';

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
      await throttledPromiseAll(5, remainingTables, async model => {
        const hasMZRows = tablesMissingData.has(model.type);
        if (!hasMZRows) {
          const query = modelQuery(model, 'mz')
            .select(raw('1'))
            .limit(1);
          const results = await (DBZ_FOR_UPDATEABLE || DBZ_FOR_INSERT_ONLY
            ? query.asOfNow()
            : query);

          if (!results.length) {
            remainingTables.delete(model);
            return;
          }
        }

        const results = await modelQuery(model, 'rr')
          .select(raw('1'))
          .limit(1);
        if (results.length) {
          tablesMissingData.delete(model.type);
          remainingTables.delete(model);
        } else {
          tablesMissingData.add(model.type);
        }
      });
      if (!tablesMissingData.size) {
        return;
      }

      await verifyMZSinkConnectors();

      throw getErr('RR tables are empty', { tables: [...tablesMissingData] });
    },
    {
      timeout: 10 * 60 * 1000,
      interval: 1000,
      ctx: 'waitForRRTablesData',
    },
  );

  printDebug(`RR has data after ${Math.round((performance.now() - startTime) / 100) / 10}s`, 'success');
}

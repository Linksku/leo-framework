import throttledPromiseAll from 'utils/throttledPromiseAll';
import MaterializedViewModels from 'core/models/allMaterializedViewModels';
import retry from 'utils/retry';
import { DBZ_FOR_INSERT_ONLY, DBZ_FOR_UPDATEABLE } from 'consts/mz';
import knexRR from 'services/knex/knexRR';
import verifyMZSinkConnectors from '../helpers/verifyMZSinkConnectors';

export default async function waitForRRTablesData() {
  printDebug('Waiting for RR tables to have data', 'highlight');
  const startTime = performance.now();

  const modelsWithSinks = MaterializedViewModels
    .filter(model => model.getReplicaTable());
  let emptyMZTables = new Set<ModelClass>();
  const emptyRRTables = new Set(modelsWithSinks);
  await retry(
    async () => {
      const remainingTables = [...emptyRRTables].filter(model => !emptyMZTables.has(model));
      await throttledPromiseAll(5, remainingTables, async model => {
        const results = await modelQuery(model, 'rr')
          .select(raw('1'))
          .limit(1);
        if (results.length) {
          emptyRRTables.delete(model);
          return;
        }

        const query = modelQuery(model, 'mz')
          .select(raw('1'))
          .limit(1);
        const results2 = await (DBZ_FOR_UPDATEABLE || DBZ_FOR_INSERT_ONLY
          ? query.asOfNow()
          : query);
        if (results2.length) {
          emptyMZTables.delete(model);
        } else {
          emptyMZTables.add(model);
        }
      });

      if (emptyMZTables.size > modelsWithSinks.length / 2) {
        emptyMZTables = new Set();
        throw new Error('Too many empty MZ tables');
      }
      if (emptyRRTables.size < emptyMZTables.size) {
        await verifyMZSinkConnectors();

        throw getErr(
          'RR tables are empty',
          { tables: [...emptyRRTables].map(model => model.type) },
        );
      }
    },
    {
      timeout: 10 * 60 * 1000,
      interval: 1000,
      ctx: 'waitForRRTablesData',
    },
  );

  printDebug(`RR has data after ${Math.round((performance.now() - startTime) / 100) / 10}s`, 'success');

  await knexRR.raw('ANALYZE');
}

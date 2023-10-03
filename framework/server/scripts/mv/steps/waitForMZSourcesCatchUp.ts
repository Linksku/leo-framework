import pLimit from 'p-limit';

import EntityModels from 'services/model/allEntityModels';
import retry from 'utils/retry';
import knexBT from 'services/knex/knexBT';
import getEntitiesWithMZSources from '../helpers/getEntitiesWithMZSources';

const limiter = pLimit(3);

// Note: if MVs aren't created right after sources are created, overrall time is slower
export default async function waitForMZSourcesCatchUp(
  insertOnly: boolean,
  timeout = 10 * 60 * 1000,
) {
  printDebug(
    `Waiting for MZ ${insertOnly ? 'insert-only' : 'updateable'} sources to catch up`,
    'highlight',
  );
  const startTime = performance.now();

  const allDeps = new Set<string>(getEntitiesWithMZSources());
  const models = EntityModels.filter(
    model => insertOnly === model.useInsertOnlyPublication && allDeps.has(model.type),
  );
  const numBTRows: Partial<Record<EntityType, number>> = Object.create(null);
  const numMZRows: Partial<Record<EntityType, number>> = Object.create(null);
  const numMZRowsRetryCount: Partial<Record<
    EntityType,
    Record<number, number>
  >> = Object.create(null);
  await Promise.all(models.map(m => limiter(async () => {
    const rows = await knexBT(m.tableName)
      .count({ count: '*' });
    numBTRows[m.type] = TS.parseIntOrNull(rows[0]?.count) ?? 0;
  })));

  const remainingModels = new Set(models.filter(m => TS.defined(numBTRows[m.type]) > 0));
  await retry(
    async () => {
      await Promise.all([...remainingModels].map(m => limiter(async () => {
        const result = await rawSelect(
          `
            SELECT count(*) count
            FROM ??
            AS OF now()
          `,
          [m.tableName],
          { db: 'mz' },
        );
        const mzRows = TS.parseIntOrNull(result.rows[0]?.count) ?? 0;
        numMZRows[m.type] = mzRows;
        if (mzRows >= TS.defined(numBTRows[m.type])) {
          remainingModels.delete(m);
        }
        const retryCount = TS.objValOrSetDefault(numMZRowsRetryCount, m.type, {});
        retryCount[mzRows] = (retryCount[mzRows] ?? 0) + 1;
      })));

      if (remainingModels.size) {
        const hasPausedSource = [...remainingModels].some(m => {
          const retryCount = TS.defined(numMZRowsRetryCount[m.type]);
          return retryCount[TS.defined(numMZRows[m.type])] >= 12;
        });
        throw getErr(
          hasPausedSource
            ? 'Sources stopped updating'
            : 'Sources haven\'t caught up',
          {
            models: [...remainingModels].map(
              m => `${m.tableName}: ${numMZRows[m.type]}/${numBTRows[m.type]}`,
            ),
          },
        );
      }
    },
    {
      timeout,
      interval: 10 * 1000,
      ctx: 'waitForMZSourcesCatchUp',
    },
  );

  printDebug(
    `MZ ${insertOnly ? 'insert-only' : 'updateable'} sources caught up after ${Math.round((performance.now() - startTime) / 100) / 10}s`,
    'success',
  );
}

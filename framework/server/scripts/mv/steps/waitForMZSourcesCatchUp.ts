import throttledPromiseAll from 'utils/throttledPromiseAll';
import EntityModels from 'services/model/allEntityModels';
import retry, { forceStopRetry } from 'utils/retry';
import knexBT from 'services/knex/knexBT';
import { MZ_TIMESTAMP_FREQUENCY } from 'consts/mz';
import getEntitiesForMZSources from '../helpers/getEntitiesForMZSources';

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

  const allDeps = new Set(getEntitiesForMZSources('all'));
  const models = EntityModels.filter(
    model => insertOnly === model.useInsertOnlyPublication && allDeps.has(model),
  );
  const numBTRows: Partial<Record<EntityType, number>> = Object.create(null);
  const numMZRows: Partial<Record<EntityType, number>> = Object.create(null);
  const numMZRowsRetryCount: Partial<Record<
    EntityType,
    Record<number, number>
  >> = Object.create(null);
  await throttledPromiseAll(3, models, async m => {
    const rows = await knexBT(m.tableName)
      .count({ count: '*' });
    numBTRows[m.type] = TS.parseIntOrNull(rows[0]?.count) ?? 0;
  });

  const remainingModels = new Set(models.filter(m => TS.defined(numBTRows[m.type]) > 0));
  await retry(
    async () => {
      await throttledPromiseAll(3, remainingModels, async m => {
        let mzRows: number;
        try {
          const result = await rawSelect(
            'mz',
            `
              SELECT count(*) count
              FROM ??
              AS OF now() + INTERVAL '${MZ_TIMESTAMP_FREQUENCY} MILLISECOND'
            `,
            [m.tableName],
            { timeout: 60 * 1000 },
          );
          mzRows = TS.parseIntOrNull(result.rows[0]?.count) ?? 0;
        } catch (err) {
          if (err instanceof Error
            && (err.message.includes(' has been altered')
              || err.message.includes('Connection terminated unexpectedly'))) {
            throw forceStopRetry(err);
          }
          throw err;
        }

        numMZRows[m.type] = mzRows;
        if (mzRows >= TS.defined(numBTRows[m.type])) {
          remainingModels.delete(m);
        }
        const retryCount = TS.objValOrSetDefault(numMZRowsRetryCount, m.type, {});
        retryCount[mzRows] = (retryCount[mzRows] ?? 0) + 1;
      });

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

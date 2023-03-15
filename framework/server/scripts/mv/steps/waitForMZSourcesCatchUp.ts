import pLimit from 'p-limit';

import EntityModels from 'services/model/allEntityModels';
import retry from 'utils/retry';
import knexBT from 'services/knex/knexBT';
import getEntitiesWithMZSources from '../helpers/getEntitiesWithMZSources';

const limiter = pLimit(3);

// todo: mid/mid figure out how to check if source is updating
export default async function waitForMZSourcesCatchUp(_models?: EntityClass[]) {
  printDebug('Waiting for MZ to catch up', 'highlight');
  const startTime = performance.now();

  const allDeps = new Set<string>(getEntitiesWithMZSources());
  const models = _models ?? EntityModels.filter(model => allDeps.has(model.type));
  const numBTRows: Partial<Record<EntityType, number>> = {};
  const numMZRows: Partial<Record<EntityType, number>> = {};
  await Promise.all(models.map(m => limiter(async () => {
    const rows = await knexBT(m.tableName)
      .count({ count: '*' });
    numBTRows[m.type] = TS.parseIntOrNull(rows[0]?.count) ?? 0;
  })));

  const remainingModels = new Set(models.filter(m => TS.defined(numBTRows[m.type]) > 0));
  await retry(
    async () => {
      await Promise.all([...remainingModels].map(m => limiter(async () => {
        const result = await rawSelect('mz', `
          SELECT count(*) count
          FROM ??
          AS OF now()
        `, [m.tableName]);
        const mzRows = TS.parseIntOrNull(result.rows[0]?.count) ?? 0;
        numMZRows[m.type] = mzRows;
        if (mzRows >= TS.defined(numBTRows[m.type])) {
          remainingModels.delete(m);
        }
      })));

      if (remainingModels.size) {
        throw getErr(
          'Sources haven\'t caught up',
          {
            models: [...remainingModels].map(m => `${m.tableName}: ${numMZRows[m.type]}`),
          },
        );
      }
    },
    {
      timeout: 10 * 60 * 1000,
      interval: 10 * 1000,
      ctx: 'waitForMZSourcesCatchUp',
    },
  );

  printDebug(`MZ caught up after ${Math.round((performance.now() - startTime) / 100) / 10}s`, 'success');
}

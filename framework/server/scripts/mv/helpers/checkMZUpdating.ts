import { START_DEPLOY_REDIS_KEY } from 'consts/infra';
import knexBT from 'services/knex/knexBT';
import redis from 'services/redis';
import retry, { forceStopRetry } from 'utils/retry';

export default async function checkMZUpdating(timeout = 60 * 1000) {
  const rows = await entityQuery(MzTestModel, knexBT)
    .patch({
      // @ts-expect-error raw
      version: raw(`
        CASE
          WHEN version + 1 >= 2147483647 THEN 1
          ELSE version + 1
        END
      `),
    })
    .where({ id: 1 })
    .returning('*');
  const updated = rows[0];
  if (!updated) {
    await ErrorLogger.fatal(new Error('checkMZUpdating: MzTestModel.update failed'));
  }

  await retry(
    async () => {
      if (await redis.get(START_DEPLOY_REDIS_KEY)) {
        throw forceStopRetry(new Error('Deploying'));
      }

      const row = await modelQuery(MzTestMV)
        .select(raw('1'))
        .where({ id: 1 })
        .where(MzTestMV.cols.version, '>=', updated.version)
        .first();
      if (!row) {
        throw new Error('MzTestMV hasn\'t updated');
      }
    },
    {
      timeout,
      interval: 1000,
      ctx: 'checkMZUpdating',
    },
  );
}

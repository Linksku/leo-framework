import { INIT_INFRA_LOCK_NAME, INIT_INFRA_LOCK_TTL, INIT_INFRA_REDIS_KEY } from 'consts/infra';
import { redisMaster } from 'services/redis';
import usingRedlock from 'utils/usingRedlock';
import getDockerStats from 'utils/infra/getDockerStats';

async function initInfraWrap(
  cb: () => Promise<void>,
  {
    lockName = INIT_INFRA_LOCK_NAME,
    redisKey = INIT_INFRA_REDIS_KEY,
    setInitInfra = true,
  }: {
    lockName?: string,
    redisKey?: string,
    setInitInfra?: boolean,
  } = {},
) {
  // todo: mid/mid ignore error if redis is unavailable
  await usingRedlock(lockName, INIT_INFRA_LOCK_TTL, async acquiredNewLock => {
    const dockerStatsTimer = setInterval(async () => {
      try {
        const stats = await getDockerStats();
        for (const pair of TS.objEntries(stats)) {
          if (pair[1].memPercentLimit > 95) {
            printDebug(
              `initInfraWrap: Docker container "${pair[0]}" using >95% memory`,
              'warn',
              { prod: 'always' },
            );
          }
        }
      } catch (err) {
        ErrorLogger.warn(err, { ctx: 'initInfraWrap: getDockerStats' });
      }
    }, 10 * 1000);

    if (!setInitInfra) {
      try {
        await cb();
      } catch (err) {
        clearInterval(dockerStatsTimer);
        throw err;
      }

      clearInterval(dockerStatsTimer);
      return;
    }

    await redisMaster.setex(redisKey, INIT_INFRA_LOCK_TTL / 1000, '1');

    const redisKeyTimer = setInterval(() => {
      wrapPromise(
        redisMaster.setex(redisKey, INIT_INFRA_LOCK_TTL / 1000, '1'),
        'warn',
        'initInfraWrap: update INIT_INFRA_REDIS_KEY',
      );
    }, INIT_INFRA_LOCK_TTL / 2);

    try {
      await cb();
    } catch (err) {
      clearInterval(redisKeyTimer);
      clearInterval(dockerStatsTimer);

      if (acquiredNewLock) {
        await redisMaster.unlink(redisKey);
      }
      throw err;
    }

    clearInterval(redisKeyTimer);
    clearInterval(dockerStatsTimer);
    if (acquiredNewLock) {
      await redisMaster.unlink(redisKey);
    }
  });
}

export default initInfraWrap;

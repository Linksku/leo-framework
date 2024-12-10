import { INIT_INFRA_LOCK_NAME, INIT_INFRA_LOCK_TTL, INIT_INFRA_REDIS_KEY } from 'consts/infra';
import { redisMaster, isRedisUnavailableErr } from 'services/redis';
import usingRedlock from 'services/redis/usingRedlock';
import getDockerStats from 'utils/infra/getDockerStats';

export default async function initInfraWrap(
  cb: () => Promise<void>,
  {
    lockName = INIT_INFRA_LOCK_NAME,
    redisKey = INIT_INFRA_REDIS_KEY,
    setInitInfra = true,
    acquireTimeout,
    allowRedisUnavailable = true,
  }: {
    lockName?: string,
    redisKey?: string,
    setInitInfra?: boolean,
    acquireTimeout?: number,
    allowRedisUnavailable?: boolean,
  } = {},
) {
  let isRedisUnavailable = false;
  const cbWrap = async (acquiredNewLock: boolean) => {
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

    if (!isRedisUnavailable) {
      await redisMaster.setex(redisKey, INIT_INFRA_LOCK_TTL / 1000, '1');
    }

    const redisKeyTimer = setInterval(async () => {
      try {
        await redisMaster.setex(redisKey, INIT_INFRA_LOCK_TTL / 1000, '1');
      } catch (err) {
        if (isRedisUnavailableErr(err)) {
          isRedisUnavailable = true;
          return;
        }
      }
      isRedisUnavailable = false;
    }, INIT_INFRA_LOCK_TTL / 2);

    try {
      await cb();
    } catch (err) {
      if (redisKeyTimer) {
        clearInterval(redisKeyTimer);
      }
      clearInterval(dockerStatsTimer);

      if (acquiredNewLock) {
        await redisMaster.unlink(redisKey);
      }
      throw err;
    }

    if (redisKeyTimer) {
      clearInterval(redisKeyTimer);
    }
    clearInterval(dockerStatsTimer);
    if (acquiredNewLock) {
      await redisMaster.unlink(redisKey);
    }
  };

  try {
    await usingRedlock(lockName, cbWrap, {
      duration: INIT_INFRA_LOCK_TTL,
      acquireTimeout,
    });
  } catch (err) {
    if (!allowRedisUnavailable || !isRedisUnavailableErr(err)) {
      throw err;
    }
    isRedisUnavailable = true;

    await cbWrap(false);
  }
}

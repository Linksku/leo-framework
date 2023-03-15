import { INIT_INFRA_LOCK_NAME, INIT_INFRA_REDIS_KEY } from 'consts/infra';
import { redisMaster } from 'services/redis';
import usingRedlock from 'utils/usingRedlock';

async function initInfraWrap(
  cb: () => Promise<void>,
  {
    lockName = INIT_INFRA_LOCK_NAME,
    redisKey = INIT_INFRA_REDIS_KEY,
    setInitInfra,
  }: {
    lockName?: string,
    redisKey?: string,
    setInitInfra?: boolean,
  } = {},
) {
  await usingRedlock(lockName, 60 * 1000, async acquiredNewLock => {
    if (!setInitInfra) {
      await cb();
      return;
    }

    await redisMaster.setex(redisKey, 60, '1');

    const timer = setInterval(() => {
      wrapPromise(
        redisMaster.setex(redisKey, 60, '1'),
        'warn',
        'initInfraWrap: update INIT_INFRA_REDIS_KEY',
      );
    }, 30 * 1000);

    try {
      await cb();
    } catch (err) {
      clearInterval(timer);
      if (acquiredNewLock) {
        await redisMaster.unlink(redisKey);
      }
      throw err;
    }

    clearInterval(timer);
    if (acquiredNewLock) {
      await redisMaster.unlink(redisKey);
    }
  });
}

export default initInfraWrap;

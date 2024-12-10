import exec from 'utils/exec';
import initInfraWrap from 'utils/infra/initInfraWrap';
import { APP_NAME_LOWER } from 'config';
import { START_DEPLOY_REDIS_KEY } from 'consts/infra';
import redis from 'services/redis';

export default async function stopMonitorInfra() {
  try {
    await redis.set(START_DEPLOY_REDIS_KEY, 1, 'PX', 10 * 60 * 1000);

    await initInfraWrap(async () => {
      try {
        await exec(`docker stop $(yarn dc -p ${APP_NAME_LOWER} ps -q monitor-infra)`);
      } catch (err) {
        if (!(err instanceof Error)
          || !err.message.includes('requires at least 1 argument')) {
          throw err;
        }
      }
    }, { acquireTimeout: 5 * 60 * 1000 });
  } catch {
    try {
      await exec(`docker stop $(yarn dc -p ${APP_NAME_LOWER} ps -q monitor-infra)`);
    } catch (err) {
      if (!(err instanceof Error)
        || !err.message.includes('requires at least 1 argument')) {
        throw err;
      }
    }
  }
}

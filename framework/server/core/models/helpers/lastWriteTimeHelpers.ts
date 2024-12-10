import redis from 'services/redis';
import getModelRecursiveDeps from 'utils/models/getModelRecursiveDeps';
import { LAST_WRITE_TIME } from 'consts/coreRedisNamespaces';
import RedisDataLoader from 'services/redis/RedisDataLoader';
import RequestContextLocalStorage from 'core/requestContext/RequestContextLocalStorage';
import promiseTimeout from 'utils/promiseTimeout';

const MIN_WAIT_TIME = 1000;
const getdelDataloader = new RedisDataLoader('getdel');

function _getRedisKey(modelType: ModelType, currentUserId: number) {
  return `${LAST_WRITE_TIME}:${currentUserId},${modelType}`;
}

export async function updateLastWriteTime(modelType: ModelType) {
  if (process.env.PRODUCTION) {
    return;
  }

  const rc = getRC();
  if (!rc?.currentUserId) {
    return;
  }

  const key = _getRedisKey(modelType, rc.currentUserId);
  try {
    await promiseTimeout(
      redis.set(key, 1, 'PX', MIN_WAIT_TIME),
      {
        timeout: 100,
        defaultVal: null,
      },
    );
  } catch (err) {
    if (!(err instanceof Error) || !err.message.includes('timed out')) {
      throw getErr(err, { ctx: `updateLastWriteTime(${modelType})` });
    }
  }
}

export async function warnIfRecentlyWritten(modelType: ModelType) {
  if (process.env.PRODUCTION) {
    return;
  }

  const rc = getRC();
  const currentUserId = rc?.currentUserId;
  if (!currentUserId) {
    return;
  }

  const deps = getModelRecursiveDeps(getModelClass(modelType));
  const vals = TS.filterNulls(await RequestContextLocalStorage.exit(
    () => Promise.all(deps.map(
      dep => getdelDataloader.load(_getRedisKey(dep.type, currentUserId))
        .catch(err => {
          if (!(err instanceof Error)
            || (!err.message.includes('timed out') && !err.message.includes('max retries'))) {
            throw err;
          }
          return null;
        }),
    )),
  ));
  if (vals.length) {
    ErrorLogger.warn(new Error(
      `warnIfRecentlyWritten: reading ${modelType} after writing to ${vals[0]}, possible read after write consistency issue`,
    ));
  }
}

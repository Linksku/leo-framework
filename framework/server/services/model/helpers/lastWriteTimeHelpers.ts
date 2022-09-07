import redis from 'services/redis';
import getModelRecursiveDeps from 'utils/models/getModelRecursiveDeps';

const redisNamespace = 'lastWriteTime';
const MIN_WAIT_TIME = 1000;

function _getRedisKey(modelType: ModelType, currentUserId: number) {
  return `${redisNamespace}:${currentUserId},${modelType}`;
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
  await redis.psetex(key, MIN_WAIT_TIME, 1);
}

export async function warnIfRecentlyWritten(modelType: ModelType) {
  if (process.env.PRODUCTION) {
    return;
  }

  const rc = getRC();
  if (!rc?.currentUserId) {
    return;
  }

  const deps = getModelRecursiveDeps(getModelClass(modelType));
  for (const dep of deps) {
    const key = _getRedisKey(dep.type, rc.currentUserId);
    // eslint-disable-next-line no-await-in-loop
    const val = await redis.getdel(key);
    if (val) {
      ErrorLogger.warn(new Error(`warnIfRecentlyWritten: reading ${modelType} after writing to ${dep.type}, possible read after write consistency issue`));
      return;
    }
  }
}

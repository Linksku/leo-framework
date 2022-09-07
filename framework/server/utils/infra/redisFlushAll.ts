import redis from 'services/redis';
import promiseTimeout from 'utils/promiseTimeout';

export default async function redisFlushAll() {
  try {
    await promiseTimeout(
      redis.flushall(),
      5000,
      new Error('redisFlushAll: timed out'),
    );
  } catch (err) {
    printDebug(err, 'error');
  }
}

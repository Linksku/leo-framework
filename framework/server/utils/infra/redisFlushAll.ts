import redis from 'services/redis';
import promiseTimeout from 'utils/promiseTimeout';

export default async function redisFlushAll(prefix?: string | string[]) {
  let promise: Promise<any>;
  if (prefix) {
    promise = typeof prefix === 'string'
      ? redis.flushprefix('0', `${prefix}:`)
      : Promise.all(prefix.map(p => redis.flushprefix('0', `${p}:`)));
  } else {
    promise = redis.flushall();
  }
  await promiseTimeout(
    promise,
    5000,
    new Error('redisFlushAll: timed out'),
  );
}

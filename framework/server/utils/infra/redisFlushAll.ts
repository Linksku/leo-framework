import redis from 'services/redis';
import promiseTimeout from 'utils/promiseTimeout';

// From https://github.com/redis/node-redis/issues/1314#issuecomment-370488211
async function flushAllHelper(prefix: string | undefined, limit: number) {
  let numDeleted = 0;
  let numFailed = 0;
  await new Promise<void>((succ, fail) => {
    const stream = redis.scanStream({
      match: prefix ? `${prefix}:*` : undefined,
      count: limit,
    });

    stream.on('data', keys => {
      if (keys.length) {
        redis.unlink(keys)
          .then(() => {
            numDeleted += keys.length;
          })
          .catch(() => {
            numFailed += keys.length;
          });
      }
    });

    stream.on('end', () => {
      if (numFailed) {
        printDebug(`redisFlushAll(${prefix ?? '*'}): ${numFailed}/${numFailed + numDeleted} failed to delete`, 'warn');
      } else {
        printDebug(`redisFlushAll(${prefix ?? '*'}): ${numDeleted} deleted`, 'success');
      }
      succ();
    });

    stream.on('error', err => {
      fail(err);
    });
  });

  if (numDeleted === limit) {
    await flushAllHelper(prefix, limit);
  }
}

export default async function redisFlushAll(prefix?: string | string[]) {
  const promise = Array.isArray(prefix)
    ? Promise.all(prefix.map(p => flushAllHelper(p, 100)))
    : flushAllHelper(prefix, 100);
  await promiseTimeout(
    promise,
    5000,
    new Error('redisFlushAll: timed out'),
  );
}

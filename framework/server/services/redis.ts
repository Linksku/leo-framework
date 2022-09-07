import Redis from 'ioredis';

function shouldIgnoreError(err: any) {
  if (err.code === 'ECONNREFUSED') {
    return true;
  }

  return false;
}

export const redisSub = new Redis();
redisSub.on('error', err => {
  if (!shouldIgnoreError(err)) {
    ErrorLogger.warn(err, 'redisSub error');
  }
});

export const redisPub = new Redis();
redisPub.on('error', err => {
  if (!shouldIgnoreError(err)) {
    ErrorLogger.warn(err, 'redisPub error');
  }
});

const redis = new Redis();
redis.on('error', err => {
  if (!shouldIgnoreError(err)) {
    ErrorLogger.warn(err, 'redis error');
  }
});

export default redis;

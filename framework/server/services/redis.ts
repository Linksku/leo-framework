import Redis from 'ioredis';

import { REDIS_HOST, REDIS_PORT } from 'consts/infra';
import ServiceContextLocalStorage, { createServiceContext } from 'services/ServiceContextLocalStorage';
import { API_TIMEOUT } from 'settings';

const redisConfig = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: process.env.REDIS_PASS,
  maxRetriesPerRequest: 3,
  commandTimeout: API_TIMEOUT / 2,
  showFriendlyErrorStack: !process.env.PRODUCTION,
};

export function shouldIgnoreRedisError(err: any) {
  return err.code === 'ECONNREFUSED'
    || err.code === 'ECONNRESET'
    || err.code === 'ENOTFOUND'
    || err.message === 'Command timed out';
}

// Note: apparently pub/sub is expensive on large cluster,
//   so it should have its own small cluster
export const redisSub = ServiceContextLocalStorage.run(
  createServiceContext('redisSub'),
  () => {
    const redisSub2 = new Redis(redisConfig);
    redisSub2.on('error', err => {
      if (!shouldIgnoreRedisError(err)) {
        ErrorLogger.error(err, { ctx: 'redisSub error' });
      }
    });
    return redisSub2;
  },
);

export const redisPub = ServiceContextLocalStorage.run(
  createServiceContext('redisPub'),
  () => {
    const redisPub2 = new Redis(redisConfig);
    redisPub2.on('error', err => {
      if (!shouldIgnoreRedisError(err)) {
        ErrorLogger.error(err, { ctx: 'redisPub error' });
      }
    });
    return redisPub2;
  },
);

// For global config, locks, etc.
// todo: mid/mid create separate Redis clusters
export const redisMaster = ServiceContextLocalStorage.run(
  createServiceContext('redisMaster'),
  () => {
    const redisMaster2 = new Redis(redisConfig);
    redisMaster2.on('error', err => {
      if (!shouldIgnoreRedisError(err)) {
        ErrorLogger.error(err, { ctx: 'redisMaster error' });
      }
    });
    return redisMaster2;
  },
);

// For values that don't mind being duplicated across servers
const redis = ServiceContextLocalStorage.run(
  createServiceContext('redis'),
  () => {
    const redis2 = new Redis(redisConfig);
    redis2.on('error', err => {
      if (!shouldIgnoreRedisError(err)) {
        ErrorLogger.error(err, { ctx: 'redis error' });
      }
    });
    return redis2;
  },
);

export default redis;

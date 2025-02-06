import Redis, { RedisOptions } from 'ioredis';

import { REDIS_HOST, REDIS_PORT, REDIS_USER } from 'consts/infra';
import ServiceContextLocalStorage, { createServiceContext } from 'services/ServiceContextLocalStorage';
import { DEFAULT_API_TIMEOUT } from 'consts/server';

export const redisConfig = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  username: REDIS_USER,
  password: process.env.REDIS_PASS,
  maxRetriesPerRequest: 2,
  commandTimeout: DEFAULT_API_TIMEOUT / 2,
  showFriendlyErrorStack: !process.env.PRODUCTION,
  lazyConnect: process.env.IS_SERVER_SCRIPT,
} satisfies RedisOptions;

export function isRedisUnavailableErr(err: unknown): boolean {
  if (!(err instanceof Error)) {
    return false;
  }
  if (err.name === 'MaxRetriesPerRequestError'
    || err.message === 'Command timed out'
    || err.message.includes('Redis unavailable')) {
    return true;
  }

  const code = TS.getProp(err, 'code');
  return [
    'ECONNREFUSED',
    'ECONNRESET',
    'ENOTFOUND',
    'EAI_AGAIN',
    'ETIMEDOUT',
  ].includes(code as string);
}

// Note: apparently pub/sub is expensive on large cluster,
//   so it should have its own small cluster
export const redisSub = ServiceContextLocalStorage.run(
  createServiceContext('redisSub'),
  () => {
    const redisSub2 = new Redis(redisConfig);
    redisSub2.on('error', err => {
      if (!isRedisUnavailableErr(err)) {
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
      if (!isRedisUnavailableErr(err)) {
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
      if (!isRedisUnavailableErr(err)) {
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
      if (!isRedisUnavailableErr(err)) {
        ErrorLogger.error(err, { ctx: 'redis error' });
      }
    });
    return redis2;
  },
);

export default redis;

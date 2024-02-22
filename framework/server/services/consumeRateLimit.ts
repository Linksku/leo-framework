import { RateLimiterRedis } from 'rate-limiter-flexible';

import { RATE_LIMIT } from 'consts/coreRedisNamespaces';
import redis from 'services/redis';

const rateLimitConfigs = new Map<
  string,
  { duration: number, maxCount: number, rateLimiter: RateLimiterRedis }
>();

export default async function consumeRateLimit({
  type,
  duration,
  maxCount,
  errMsg,
  key,
}: {
  type: string,
  duration: number,
  maxCount: number,
  errMsg: string,
  key: number | string,
}) {
  let config = rateLimitConfigs.get(type);
  if (!config) {
    config = {
      duration,
      maxCount,
      rateLimiter: new RateLimiterRedis({
        storeClient: redis,
        keyPrefix: `${RATE_LIMIT}:${type}`,
        points: maxCount,
        duration,
      }),
    };
    rateLimitConfigs.set(type, config);
  }

  if (!process.env.PRODUCTION
    && (config.duration !== duration || config.maxCount !== maxCount)) {
    throw new Error(`consumeRateLimit(${type}): config changed`);
  }

  try {
    await config.rateLimiter.consume(key);
  } catch {
    throw new UserFacingError(errMsg, 429);
  }
}

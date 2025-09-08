import { RateLimiterRedis } from 'rate-limiter-flexible';

import { RATE_LIMIT } from 'consts/coreRedisNamespaces';
import rateLimits from 'config/rateLimits';
import redis from 'services/redis';

const defaultRateLimits = {
  registerUser: {
    limit: 3,
    interval: 10 * 60,
  },
  resetPassword: {
    limit: 3,
    interval: 10 * 60,
  },
  sendVerifyEmailEmail: {
    limit: 1,
    interval: 60,
  },
};

const rateLimiters = Object.fromEntries(
  [
    ...TS.objEntries(defaultRateLimits),
    ...TS.objEntries(rateLimits),
  ].map(([key, value]) => [
    key,
    new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: `${RATE_LIMIT}:${key}`,
      points: value.limit,
      duration: value.interval,
    }),
  ]),
) satisfies ObjectOf<RateLimiterRedis>;

export function incrementRateLimit(type: keyof typeof rateLimiters, limit: number) {
  return rateLimiters[type].penalty(limit);
}

export default async function consumeRateLimit({
  type,
  errMsg,
  key,
}: {
  type: keyof typeof rateLimiters,
  errMsg: string,
  key: number | string,
}) {
  const rateLimiter = rateLimiters[type];

  try {
    await rateLimiter.consume(key);
  } catch {
    throw new UserFacingError(errMsg, 429);
  }
}

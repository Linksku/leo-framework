import { RateLimiterRedis } from 'rate-limiter-flexible';

import { RATE_LIMIT } from 'consts/coreRedisNamespaces';
import redis from 'services/redis';

const rateLimiters = {
  createClub: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: RATE_LIMIT + ':createClub',
    points: 3,
    duration: 24 * 60 * 60,
  }),
  createMeetup: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: RATE_LIMIT + ':createMeetup',
    points: 3,
    duration: 60 * 60,
  }),
  createMeetupResponse: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: RATE_LIMIT + ':createMeetupResponse',
    points: 10,
    duration: 60 * 60,
  }),
  createPost: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: RATE_LIMIT + ':createPost',
    points: 10,
    duration: 60 * 60,
  }),
  createPrivateMessage: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: RATE_LIMIT + ':createPrivateMessage',
    points: 10,
    duration: 60 * 60,
  }),
  createReply: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: RATE_LIMIT + ':createReply',
    points: 10,
    duration: 60,
  }),
  registerForMeetupResponse: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: RATE_LIMIT + ':registerForMeetupResponse',
    points: 3,
    duration: 60 * 60,
  }),
  registerUser: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: RATE_LIMIT + ':registerUser',
    points: 3,
    duration: 10 * 60,
  }),
  resetPassword: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: RATE_LIMIT + ':resetPassword',
    points: 3,
    duration: 10 * 60,
  }),
  sendVerifyEmailEmail: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: RATE_LIMIT + ':sendVerifyEmailEmail',
    points: 1,
    duration: 60,
  }),
} satisfies ObjectOf<RateLimiterRedis>;

export function incrementRateLimit(type: keyof typeof rateLimiters, points: number) {
  return rateLimiters[type].penalty(points);
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

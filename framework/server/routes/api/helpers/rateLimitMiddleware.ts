import type { NextFunction } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';

import redisClient from 'services/redis';
import { RATE_LIMIT } from 'consts/coreRedisNamespaces';

// Allow 10x the traffic per IP as per user, since users can share IP.
const PER_IP_MULTIPLIER = 10;

export default function rateLimitMiddleware(reqsPerMin: number) {
  const POINTS_PER_REQ = PER_IP_MULTIPLIER;
  const rateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: RATE_LIMIT,
    points: reqsPerMin * POINTS_PER_REQ,
    duration: 60,
  });

  return async (
    req: ExpressRequest,
    res: ExpressResponse,
    next: NextFunction,
  ) => {
    if (!process.env.PRODUCTION && req.query?.PROFILING) {
      next();
      return;
    }

    const batchedMultiplier = req.path === '/batched' ? 3 : 1;
    try {
      await promiseObj({
        perId: rateLimiter.consume(req.ip, POINTS_PER_REQ / PER_IP_MULTIPLIER * batchedMultiplier),
        perUser: req.currentUserId
          ? rateLimiter.consume(req.currentUserId, POINTS_PER_REQ * batchedMultiplier)
          : null,
      });
      next();
    } catch {
      res.status(429)
        .json({
          status: 429,
          error: {
            msg: 'Too many requests.',
          },
        });
    }
  };
}

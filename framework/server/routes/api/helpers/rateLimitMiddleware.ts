import type { NextFunction } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';

import redisClient from 'services/redis';

// Allow 10x the traffic per IP as per user, since users can share IP.
const PER_IP_MULTIPLIER = 10;

export default function rateLimitMiddleware(reqsPerMin: number) {
  const POINTS_PER_REQ = PER_IP_MULTIPLIER;
  const rateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'middleware',
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

    try {
      await Promise.all([
        // todo: low/mid count batched requests as multiple requests for rate limiting
        rateLimiter.consume(req.ip, POINTS_PER_REQ / PER_IP_MULTIPLIER),
        ...(
          req.currentUserId
            ? [rateLimiter.consume(req.currentUserId, POINTS_PER_REQ)]
            : []
        ),
      ]);
      next();
    } catch {
      res.status(429).send('Too many requests');
    }
  };
}

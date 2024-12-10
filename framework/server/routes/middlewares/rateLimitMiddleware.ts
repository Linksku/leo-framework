import type { NextFunction } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';

import redisClient from 'services/redis';
import { RATE_LIMIT } from 'consts/coreRedisNamespaces';

const POINTS_PER_USER_REQ = 10;
// Allow 10x the traffic per IP as per user, since users can share IP.
const POINTS_PER_IP_REQ = 1;

export default function rateLimitMiddleware(reqsPerMin: number) {
  const initialPoints = reqsPerMin * POINTS_PER_USER_REQ;
  // Note: there's a bug where Redis expiration sometimes becomes much higher than 1min
  const rateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: `${RATE_LIMIT}:api`,
    points: initialPoints,
    duration: 60,
    rejectIfRedisNotReady: true,
  });

  return async (
    req: ExpressRequest,
    res: ExpressResponse,
    next: NextFunction,
  ) => {
    if (!process.env.PRODUCTION && req.query?.LOAD_TESTING) {
      next();
      return;
    }

    const { ip, currentUserId } = req;
    if (!ip) {
      res.status(500)
        .json({
          status: 500,
          error: {
            msg: 'Invalid request.',
          },
        });
      return;
    }

    try {
      const { ipRes, userRes } = await promiseObj({
        ipRes: rateLimiter.consume(ip, POINTS_PER_IP_REQ),
        userRes: currentUserId
          ? rateLimiter.consume(currentUserId, POINTS_PER_USER_REQ)
          : null,
      });

      const remaining = Math.max(0, Math.min(
        ipRes.remainingPoints / initialPoints,
        userRes ? userRes.remainingPoints / initialPoints : 1,
      ));

      if (remaining < 0.3) {
        await pause((0.3 - remaining) / 0.3 * 2000);
      }

      next();
    } catch (err) {
      if (err instanceof Error && err.message.includes('Redis connection is not ready')) {
        next();
        return;
      }

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

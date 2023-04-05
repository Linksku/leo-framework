import type { NextFunction } from 'express';
import express from 'express';
import multer from 'multer';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import { getApis } from 'services/ApiManager';
import apiWrap from 'routes/api/helpers/apiWrap';
import { fetchUserIdByJwt } from 'helpers/auth/jwt';
import { DOMAIN_NAME, HOME_URL, PROTOCOL } from 'settings';
import rateLimitMiddleware from 'routes/api/helpers/rateLimitMiddleware';
import requestContextMiddleware from 'routes/api/helpers/requestContextMiddleware';
import formatAndLogApiErrorResponse from 'routes/api/helpers/formatAndLogApiErrorResponse';
import { isHealthy } from 'services/healthcheck/HealthcheckManager';

import './api/authApis';
import './api/batchedApi';
import './api/debugApi';
import './api/notifsApi';
import './api/sseApis';
import 'config/apis';

const upload = multer({
  dest: '/tmp',
  limits: {
    // 25 MB
    fileSize: 25 * 1024 * 1024,
  },
});

function healthcheckMiddleware(
  req: ExpressRequest,
  res: ExpressResponse,
  next: NextFunction,
) {
  if (req.path === '/status' || isHealthy()) {
    next();
  } else {
    res.status(503)
      .json({
        status: 503,
        data: null,
        error: {
          msg: 'Service temporarily unavailable',
        },
      } as ApiErrorResponse);
  }
}

async function addUserMiddleware(
  req: ExpressRequest,
  _res: ExpressResponse,
  next: NextFunction,
) {
  const cookieJwt = req.cookies?.authToken;
  const headerJwt = req.headers.authorization;
  req.currentUserId = (await fetchUserIdByJwt(cookieJwt, headerJwt)) ?? undefined;
  next();
}

function requireAuthMiddleware(
  req: ExpressRequest,
  res: ExpressResponse,
  next: NextFunction,
) {
  if (typeof req.currentUserId !== 'number' || req.currentUserId <= 0) {
    res.status(401)
      .json({
        status: 401,
        data: null,
        error: {
          msg: 'Not authenticated',
        },
      } as ApiErrorResponse);
  } else {
    next();
  }
}

function apiNotFound(
  _req: ExpressRequest,
  res: ExpressResponse,
) {
  res.status(404)
    .json({
      error: {
        title: 'API not found.',
      },
    });
}

const router = express.Router();
const apis = getApis();

if (!process.env.PRODUCTION) {
  router.use((req, res, next) => {
    if (req.query?.DEBUG && req.path !== '/sseSubscribe' && req.path !== '/sseUnsubscribe') {
      printDebug(`${req.method} ${req.path} start`, 'highlight');

      res.on('finish', () => {
        printDebug(`${req.method} ${req.path} end`, 'highlight');
      });
    }

    next();
  });
}

router.use(cors({
  origin: [
    HOME_URL,
    new RegExp(`${PROTOCOL}([^/]+\\.)?${DOMAIN_NAME}$`, 'i'),
  ],
  optionsSuccessStatus: 200,
  credentials: true,
  allowedHeaders: [
    'authorization',
    'content-type',
  ],
}));

router.use(healthcheckMiddleware);
router.use(cookieParser());
router.use(addUserMiddleware);
router.use(rateLimitMiddleware(100));

router.use(express.json());
router.use(express.urlencoded({ extended: true }));
router.use(requestContextMiddleware);

// Unauth.
for (const api of apis) {
  if (!api.config.auth) {
    router[api.config.method ?? 'get'](
      `/${api.config.name}`,
      apiWrap(api),
    );
  }
}

// Auth.
router.use(requireAuthMiddleware);
for (const api of apis) {
  if (api.config.auth) {
    if (api.config.fileFields) {
      router[api.config.method ?? 'get'](
        `/${api.config.name}`,
        upload.fields(api.config.fileFields),
        apiWrap(api),
      );
    } else {
      router[api.config.method ?? 'get'](
        `/${api.config.name}`,
        apiWrap(api),
      );
    }
  }
}

router.use('/', apiNotFound);

// Express checks number of args
router.use((err: Error, _req: ExpressRequest, res: ExpressResponse, _next: NextFunction) => {
  const result = formatAndLogApiErrorResponse(err, 'apiRoutes', 'default');
  res.status(result.status)
    .set('Content-Type', 'application/json; charset=utf-8')
    .send(JSON.stringify(
      result,
      null,
      process.env.PRODUCTION ? 0 : 2,
    ));
});

export default router;

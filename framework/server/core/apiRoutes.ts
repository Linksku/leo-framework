import type { NextFunction } from 'express';
import express from 'express';
import multer from 'multer';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import { getApis } from 'services/ApiManager';
import apiWrap from 'api/helpers/apiWrap';
import rateLimitMiddleware from 'api/helpers/rateLimitMiddleware';
import requestContextMiddleware from 'api/helpers/requestContextMiddleware';
import formatAndLogApiErrorResponse from 'api/helpers/formatAndLogApiErrorResponse';
import { isHealthy } from 'services/healthcheck/HealthcheckManager';
import addUserMiddleware from 'api/helpers/auth/addUserMiddleware';
import { API_ROUTES_HEADERS } from 'consts/httpHeaders';
import { DOMAIN_NAME, HOME_URL, PROTOCOL } from 'consts/server';

import streamApi from 'api/streamApi';
import 'api/authApis';
import 'api/batchedApi';
import 'api/debugApis';
import 'api/notifsApis';
import 'api/notifsSeenApis';
import 'api/sseApis';
// eslint-disable-next-line import/order
import addApiRoutes from 'config/addApiRoutes';

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
  if (process.env.PRODUCTION
    && req.path !== '/status'
    && !isHealthy({
      ignoreStaleRR: true,
      onlyFatal: req.method !== 'GET',
    })) {
    res
      .status(503)
      .json({
        status: 503,
        error: {
          msg: 'Service temporarily unavailable',
        },
      } satisfies ApiErrorResponse);
  } else {
    next();
  }
}

function requireAuthMiddleware(
  req: ExpressRequest,
  res: ExpressResponse,
  next: NextFunction,
) {
  if (typeof req.currentUserId !== 'number' || req.currentUserId <= 0) {
    res
      .status(401)
      .json({
        status: 401,
        error: {
          msg: 'Not authenticated',
        },
      } satisfies ApiErrorResponse);
  } else {
    next();
  }
}

const router = express.Router();
const apis = getApis();

if (!process.env.PRODUCTION) {
  router.use((req, res, next) => {
    if (!process.env.PRODUCTION
      && req.query?.DEBUG
      && req.path !== '/sseSubscribe'
      && req.path !== '/sseUnsubscribe'
      && req.path !== '/checkEntityExists') {
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
router.use(rateLimitMiddleware(process.env.PRODUCTION ? 100 : 200));

router.use(express.json());
router.use(express.urlencoded({ extended: true }));
router.use(requestContextMiddleware);

router.get('/stream', streamApi);
addApiRoutes(router);

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

router.use('/', (_req: ExpressRequest, res: ExpressResponse) => {
  res
    .status(404)
    .json({
      status: 404,
      error: {
        msg: 'API not found.',
      },
    } satisfies ApiErrorResponse);
});

// Express checks number of args
router.use((err: Error, _req: ExpressRequest, res: ExpressResponse, _next: NextFunction) => {
  const result = formatAndLogApiErrorResponse(err, 'apiRoutes', 'default');
  res
    .status(result.status)
    .set(API_ROUTES_HEADERS)
    .send(JSON.stringify(
      result,
      null,
      process.env.PRODUCTION ? 0 : 2,
    ));
});

export default router;

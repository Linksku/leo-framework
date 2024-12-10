import type { NextFunction } from 'express';
import express from 'express';
import multer from 'multer';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import { getApis } from 'services/ApiManager';
import apiWrap from 'routes/apis/apiWrap';
import addUserMiddleware from 'routes/middlewares/addUserMiddleware';
import rateLimitMiddleware from 'routes/middlewares/rateLimitMiddleware';
import requestContextMiddleware from 'routes/middlewares/requestContextMiddleware';
import formatAndLogApiErrorResponse from 'routes/apis/formatAndLogApiErrorResponse';
import { isHealthy } from 'services/healthcheck/HealthcheckManager';
import { API_ROUTES_HEADERS, CORS_ORIGIN } from 'consts/httpHeaders';

import streamApi from 'apis/streamApi';
import 'apis/authApis';
import 'apis/batchedApi';
import 'apis/debugApis';
import 'apis/ftueApis';
import 'apis/notifsApis';
import 'apis/notifsSeenApis';
import 'apis/notifSettingsApis';
import 'apis/sseApis';
// eslint-disable-next-line import/order
import addApiRoutes from 'config/addApiRoutes';

const apis = getApis();
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
  if (typeof req.currentUserId === 'number' && req.currentUserId > 0) {
    next();
    return;
  }

  const apiName = req.path.split('/')[1];
  if (apis.some(api => api.config.auth && api.config.name === apiName)) {
    res
      .status(401)
      .json({
        status: 401,
        error: {
          msg: 'Not authenticated.',
        },
      } satisfies ApiErrorResponse);
  } else {
    next();
  }
}

const router = express.Router();

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
  origin: CORS_ORIGIN,
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
router.use(rateLimitMiddleware(120));

router.use(express.json({ limit: '10mb' }));
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

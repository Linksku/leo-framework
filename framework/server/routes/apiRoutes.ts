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

import './api/authApis';
import './api/batchedApi';
import './api/notifsApi';
import './api/reportsApis';
import './api/sseApis';
import 'config/apis';

const upload = multer({ dest: '/tmp' });

async function addUserMiddleware(
  req: ExpressRequest,
  _res: ExpressResponse,
  next: NextFunction,
) {
  const cookieJwt = req.cookies.authToken;
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
    res.status(401).json({
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
  res.status(404).json({
    error: {
      title: 'API not found.',
    },
  });
}

const router = express.Router();
const apis = getApis();
if (!process.env.PRODUCTION) {
  router.use((req, res, next) => {
    if (req.query?.DEBUG) {
      printDebug(`${req.method} ${req.path} start`, 'highlight');

      res.on('finish', () => {
        printDebug(`${req.method} ${req.path} end`, 'highlight');
      });
    }

    next();
  });
}

router.use(cookieParser());
router.use('/', addUserMiddleware);
router.use(rateLimitMiddleware(60));

router.use(express.json());
router.use(express.urlencoded({ extended: true }));
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
router.use('/', requireAuthMiddleware);
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

export default router;

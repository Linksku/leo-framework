import type { NextFunction } from 'express';
import multer from 'multer';

import { apis } from 'services/ApiManager';
import apiWrap from 'lib/apiWrap/apiWrap';
import { fetchUserIdByJwt } from 'lib/authHelpers';

import './api/authApis';
import './api/batchedApi';
import './api/notifsApi';
import './api/reportsApis';
import './api/sseApis';
import '../../src/server/config/apis';

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

async function requireAuthMiddleware(
  req: ExpressRequest,
  res: ExpressResponse,
  next: NextFunction,
) {
  if (typeof req.currentUserId !== 'number' || req.currentUserId <= 0) {
    res.status(401).json({
      error: {
        title: 'Not authenticated',
      },
    });
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
router.use('/', addUserMiddleware);

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

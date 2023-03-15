import express from 'express';
import jwt from 'jsonwebtoken';
import cors from 'cors';

import SseConnectionsManager from 'services/sse/SseConnectionsManager';
import serializeSseEvent from 'utils/serializeSseEvent';
import generateUuid from 'utils/generateUuid';
import SseBroadcastManager from 'services/sse/SseBroadcastManager';
import formatAndLogApiErrorResponse from 'routes/api/helpers/formatAndLogApiErrorResponse';
import rateLimitMiddleware from 'routes/api/helpers/rateLimitMiddleware';
import requestContextMiddleware from 'routes/api/helpers/requestContextMiddleware';
import RequestContextLocalStorage from 'services/requestContext/RequestContextLocalStorage';
import { DOMAIN_NAME, HOME_URL, PROTOCOL } from 'settings';
import { SSE_JWT_KEY } from 'helpers/auth/jwt';

const router = express.Router();
router.use(rateLimitMiddleware(100));

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

router.get('/', async (req, res) => {
  try {
    let params = {} as {
      otp: Nullish<string>,
      events: Nullish<{
        name: string,
        params: any,
      }[]>,
    };
    if (typeof req.query.params === 'string') {
      try {
        params = JSON.parse(req.query.params);
      } catch {}
    }

    const { otp, events } = params;
    let currentUserId: EntityId | null = null;

    if (otp) {
      currentUserId = await new Promise(succ => {
        jwt.verify(
          otp,
          SSE_JWT_KEY,
          {},
          (err, obj: any) => {
            if (err) {
              succ(null);
            } else {
              succ(obj?.id ?? null);
            }
          },
        );
      });

      if (!currentUserId) {
        throw new UserFacingError('Failed to verify OTP.', 401);
      }
    }

    let sessionId = generateUuid();
    if (currentUserId) {
      sessionId = `${currentUserId}:${sessionId}`;
    }
    SseConnectionsManager.addConn(sessionId, currentUserId, res);

    req.on('close', () => {
      SseConnectionsManager.removeConn(sessionId);
      RequestContextLocalStorage.disable();
    });

    req.on('end', () => {
      SseConnectionsManager.removeConn(sessionId);
      RequestContextLocalStorage.disable();
    });

    res.status(200).set({
      connection: 'keep-alive',
      'cache-control': 'no-cache',
      'content-type': 'text/event-stream',
      'access-control-allow-credentials': 'true',
    });

    if (events) {
      await Promise.all(events.map(
        event => SseBroadcastManager.subscribe(
          sessionId,
          event.name,
          event.params,
          currentUserId,
        ),
      ));
    }

    // todo: low/mid move types into shared constants
    const response: SseResponse = {
      eventType: serializeSseEvent('sseConnected'),
      status: 200,
      data: {
        sessionId,
      },
      entities: [],
    };
    SseConnectionsManager.sendMessage(sessionId, JSON.stringify(response));
  } catch (err) {
    const { status, error } = formatAndLogApiErrorResponse(err, 'sseRoute', 'default');
    res.status(status).json(error);
  }
});

export default router;

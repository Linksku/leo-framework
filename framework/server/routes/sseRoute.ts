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
import safeParseJson from 'utils/safeParseJson';

const router = express.Router();
router.use(rateLimitMiddleware(process.env.PRODUCTION ? 100 : 200));

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
    let otp: string | null = null;
    let events: {
      name: string,
      params: any,
    }[] | null = null;
    if (typeof req.query.params === 'string') {
      const parsed = safeParseJson<ObjectOf<any>>(
        req.query.params,
        val => val && typeof val === 'object',
      );
      if (parsed) {
        otp = parsed.otp;
        events = parsed.events;
      }
    }

    let currentUserId: EntityId | null = null;
    if (otp) {
      currentUserId = await new Promise(succ => {
        jwt.verify(
          otp as string,
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

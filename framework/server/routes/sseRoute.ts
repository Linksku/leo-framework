import express from 'express';
import jwt from 'jsonwebtoken';
import cors from 'cors';

import SseConnectionsManager from 'services/SseConnectionsManager';
import serializeEvent from 'lib/serializeEvent';
import generateUuid from 'lib/generateUuid';
import SseBroadcastManager from 'services/SseBroadcastManager';
import handleApiError from 'lib/apiHelpers/handleApiError';
import rateLimitMiddleware from 'lib/apiHelpers/rateLimitMiddleware';
import requestContextMiddleware from 'lib/apiHelpers/requestContextMiddleware';
import { DOMAIN_NAME, HOME_URL, PROTOCOL } from 'settings';

const router = express.Router();
router.use(rateLimitMiddleware(60));

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
          TS.defined(process.env.SSE_JWT_KEY),
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
        ErrorLogger.warn(new Error('sseRoute: failed to verify OTP.'));
      }
    }

    let sessionId = generateUuid();
    if (currentUserId) {
      sessionId = `${currentUserId}:${sessionId}`;
    }
    SseConnectionsManager.addConn(sessionId, currentUserId, res);

    req.on('close', () => {
      SseConnectionsManager.removeConn(sessionId);
    });

    req.on('end', () => {
      SseConnectionsManager.removeConn(sessionId);
    });

    res.status(200).set({
      connection: 'keep-alive',
      'cache-control': 'no-cache',
      'content-type': 'text/event-stream',
      'access-control-allow-credentials': 'true',
    });

    if (events) {
      for (const event of events) {
        SseBroadcastManager.subscribe(sessionId, event.name, event.params);
      }
    }

    // todo: low/mid move types into shared constants
    const response: SseResponse = {
      eventType: serializeEvent('sseConnected'),
      status: 200,
      data: {
        sessionId,
      },
      entities: [],
    };
    SseConnectionsManager.sendMessage(sessionId, JSON.stringify(response));
  } catch (err) {
    ErrorLogger.error(err, 'sseRoute');

    const { status, errorData } = handleApiError(err, 'sseRoute');
    res.status(status).json(errorData);
  }
});

export default router;

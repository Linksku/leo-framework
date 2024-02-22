import express from 'express';
import cors from 'cors';

import SseConnectionsManager from 'services/sse/SseConnectionsManager';
import serializeSseEvent from 'utils/serializeSseEvent';
import generateUuid from 'utils/generateUuid';
import SseBroadcastManager from 'services/sse/SseBroadcastManager';
import formatAndLogApiErrorResponse from 'api/helpers/formatAndLogApiErrorResponse';
import rateLimitMiddleware from 'api/helpers/rateLimitMiddleware';
import requestContextMiddleware from 'api/helpers/requestContextMiddleware';
import RequestContextLocalStorage from 'services/requestContext/RequestContextLocalStorage';
import { verifyJwt } from 'api/helpers/auth/jwt';
import safeParseJson from 'utils/safeParseJson';
import { SSE_API_HEADERS } from 'consts/httpHeaders';
import { DOMAIN_NAME, HOME_URL, PROTOCOL } from 'consts/server';

const router = express.Router();

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
router.use(rateLimitMiddleware(process.env.PRODUCTION ? 100 : 200));
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
        val => TS.isObj(val),
      );
      if (parsed) {
        otp = parsed.otp;
        events = parsed.events;
      }
    }

    let currentUserId: Nullish<EntityId> = null;
    if (otp) {
      const data = await verifyJwt(
        'sse',
        otp,
        payload => typeof payload.id === 'number' && payload.id > 0,
      );
      currentUserId = data?.id;

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

    res.status(200).set(SSE_API_HEADERS);

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

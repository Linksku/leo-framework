import jwt from 'jsonwebtoken';

import SseConnectionsManager from 'services/SseConnectionsManager';
import serializeEvent from 'lib/serializeEvent';
import generateUuid from 'lib/generateUuid';
import SseBroadcastManager from 'services/SseBroadcastManager';
import handleApiError from 'lib/apiWrap/handleApiError';
import ReqErrorLogger from 'lib/errorLogger/ReqErrorLogger';

const router = express.Router();

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
    let currentUserId: number | null = null;

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

    if (events) {
      for (const event of events) {
        SseBroadcastManager.subscribe(sessionId, event.name, event.params);
      }
    }

    res.status(200).set({
      connection: 'keep-alive',
      'cache-control': 'no-cache',
      'content-type': 'text/event-stream',
      'access-control-allow-credentials': 'true',
    });

    // todo: low/mid move types into shared constants
    SseConnectionsManager.sendMessage(sessionId, JSON.stringify({
      type: serializeEvent('sseConnected'),
      entities: [],
      meta: {
        sessionId,
      },
    }));
  } catch (err) {
    ReqErrorLogger.error(req, err, 'sseRoute');

    const { status, errorData } = handleApiError(err, 'sseRoute');
    res.status(status).json(errorData);
  }
});

export default router;

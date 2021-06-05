import jwt from 'jsonwebtoken';

import SseConnectionsManager from 'services/SseConnectionsManager';
import serializeEvent from 'lib/serializeEvent';
import generateUuid from 'lib/generateUuid';

const router = express.Router();

router.get('/', async (req, res) => {
  const otpJwt = req.query.otp as Nullish<string>;
  let currentUserId: number | null = null;

  if (otpJwt) {
    currentUserId = await new Promise(succ => {
      jwt.verify(
        otpJwt,
        process.env.SSE_JWT_KEY as string,
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

  res.status(200).set({
    connection: 'keep-alive',
    'cache-control': 'no-cache',
    'content-type': 'text/event-stream',
  });

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

  // todo: low/mid move types into shared constants
  SseConnectionsManager.sendMessage(sessionId, JSON.stringify({
    type: serializeEvent('sseConnected'),
    entities: [],
    meta: {
      sessionId,
    },
  }));
});

export default router;

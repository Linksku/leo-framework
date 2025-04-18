import type SseBroadcastManagerType from './SseBroadcastManager';

let SseBroadcastManager: typeof SseBroadcastManagerType | undefined;

type Conn = {
  userId: EntityId | null,
  res: ExpressResponse,
  lastMsgTime: number,
};

const MIN_HEARTBEAT_TIME = 30 * 1000;

const conns = new Map<string, Conn>();

let timer = null as NodeJS.Timeout | null;

const SseConnectionsManager = {
  addConn(sessionId: string, userId: EntityId | null, res: ExpressResponse) {
    if (!conns.has(sessionId)) {
      conns.set(sessionId, {
        userId,
        res,
        lastMsgTime: performance.now(),
      });
    }
  },

  removeConn(sessionId: string) {
    const conn = conns.get(sessionId);
    if (!conn) {
      return;
    }

    if (!SseBroadcastManager) {
      SseBroadcastManager
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        = (require('./SseBroadcastManager') as { default: typeof SseBroadcastManagerType })
          .default;
    }
    SseBroadcastManager.unsubscribeAll(sessionId);
    conns.delete(sessionId);
  },

  getConn(sessionId: string) {
    return conns.get(sessionId);
  },

  // todo: high/mid keep msgs for a while in case client disconnects
  sendMessage(sessionId: string, data: string) {
    const conn = conns.get(sessionId);
    if (conn) {
      conn.res.write(`data: ${data}\n\n`);
      conn.res.flush();
      conn.lastMsgTime = performance.now();
    }
  },

  sendHeartbeat(this: void) {
    for (const conn of conns.values()) {
      if (performance.now() - conn.lastMsgTime > MIN_HEARTBEAT_TIME) {
        try {
          conn.res.write(':\n\n');
          conn.res.flush();
        } catch {}
        conn.lastMsgTime = performance.now();
      }
    }

    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(SseConnectionsManager.sendHeartbeat, 10_000);
  },
};

timer = setTimeout(SseConnectionsManager.sendHeartbeat, 10_000);

export default SseConnectionsManager;

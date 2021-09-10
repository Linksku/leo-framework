import { performance } from 'perf_hooks';

type Conn = {
  userId: number | null,
  res: ExpressResponse,
  lastMsgTime: number,
};

const MIN_HEARTBEAT_TIME = 30 * 1000;

const conns = Object.create(null) as ObjectOf<Conn>;

let timer = null as NodeJS.Timeout | null;

const SseConnectionsManager = {
  addConn(sessionId: string, userId: number | null, res: ExpressResponse) {
    if (!conns[sessionId]) {
      conns[sessionId] = {
        userId,
        res,
        lastMsgTime: performance.now(),
      };
    }
  },

  removeConn(sessionId: string) {
    const conn = conns[sessionId];
    if (!conn) {
      return;
    }

    // eslint-disable-next-line global-require
    require('services/SseBroadcastManager').default.unsubscribeAll(sessionId);
    delete conns[sessionId];
  },

  getConn(sessionId: string) {
    return conns[sessionId];
  },

  sendMessage(sessionId: string, data: string) {
    const conn = conns[sessionId];
    if (conn) {
      conn.res.write(`data: ${data}\n\n`);
      conn.res.flush();
      conn.lastMsgTime = performance.now();
    }
  },

  sendHeartbeat() {
    for (const conn of TS.objectValues(conns)) {
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

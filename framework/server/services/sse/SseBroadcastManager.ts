import cluster from 'cluster';

import SseConnectionsManager from 'services/sse/SseConnectionsManager';
import PubSubManager from 'services/PubSubManager';
import serializeSseEvent from 'utils/serializeSseEvent';
import formatApiSuccessResponse from 'routes/api/helpers/formatApiSuccessResponse';
import canSubscribeToSse from 'config/canSubscribeToSse';
import { NUM_CLUSTER_SERVERS } from 'serverSettings';

export type SseData = {
  // temp
  data: any,
  entities?: Model[];
  createdEntities?: Model[];
  updatedEntities?: Model[];
  deletedIds?: Partial<Record<ModelType, EntityId[]>>,
};

type SubUnsubMessage = {
  sessionId: string,
  eventType: string,
};

const SUBSCRIBE_EVENT_NAME = 'SseBroadcastManager.subscribe';
const UNSUBSCRIBE_EVENT_NAME = 'SseBroadcastManager.unsubscribe';

const sessionIdToEventTypes = new Map<string, Set<string>>();
const eventTypesToSessionIds = new Map<string, Set<string>>();

const SseBroadcastManager = {
  async subscribe(
    sessionId: string,
    eventName: string,
    eventParams: JsonObj,
    currentUserId: Nullish<EntityId>,
  ) {
    if ((!eventName || !eventParams) && !process.env.PRODUCTION) {
      throw new Error('SseBroadcastManager.subscribe: invalid params.');
    }

    if (!await canSubscribeToSse(eventName, eventParams, currentUserId)) {
      ErrorLogger.warn(
        new Error(`SseBroadcastManager.subscribe: couldn't subscribe to ${eventName}`),
      );
      return;
    }

    const eventType = serializeSseEvent(eventName, eventParams);
    SseBroadcastManager.subscribeRaw(sessionId, eventType);
  },

  subscribeRaw(sessionId: string, eventType: string) {
    const conn = SseConnectionsManager.getConn(sessionId);
    if (!conn) {
      PubSubManager.publish(SUBSCRIBE_EVENT_NAME, JSON.stringify({
        sessionId,
        eventType,
      }));
      return;
    }

    const eventTypes = TS.mapValOrSetDefault(sessionIdToEventTypes, sessionId, new Set());
    const sessionIds = TS.mapValOrSetDefault(eventTypesToSessionIds, eventType, new Set());
    if (!sessionIds.size) {
      PubSubManager.subscribe(
        `sse:${eventType}`,
        (data: string) => SseBroadcastManager.sendToConnections(eventType, data),
      );
    }
    eventTypes.add(eventType);
    sessionIds.add(sessionId);
  },

  unsubscribe(sessionId: string, eventName: string, eventParams: JsonObj) {
    const eventType = serializeSseEvent(eventName, eventParams);
    SseBroadcastManager.unsubscribeRaw(sessionId, eventType);
  },

  unsubscribeRaw(sessionId: string, eventType: string) {
    const conn = SseConnectionsManager.getConn(sessionId);
    if (!conn) {
      PubSubManager.publish(UNSUBSCRIBE_EVENT_NAME, JSON.stringify({
        sessionId,
        eventType,
      }));
      return;
    }

    const eventTypes = sessionIdToEventTypes.get(sessionId);
    if (eventTypes) {
      eventTypes.delete(eventType);
      if (!eventTypes.size) {
        sessionIdToEventTypes.delete(sessionId);
      }
    }

    const sessionIds = eventTypesToSessionIds.get(eventType);
    if (sessionIds) {
      sessionIds.delete(sessionId);
      if (!sessionIds.size) {
        eventTypesToSessionIds.delete(eventType);
        PubSubManager.unsubscribeAll(eventType);
      }
    }
  },

  unsubscribeAll(sessionId: string) {
    const eventTypes = sessionIdToEventTypes.get(sessionId);
    if (!eventTypes) {
      return;
    }

    for (const eventType of eventTypes) {
      const sessionIds = eventTypesToSessionIds.get(eventType);
      if (sessionIds) {
        sessionIds.delete(sessionId);
        if (!sessionIds.size) {
          eventTypesToSessionIds.delete(eventType);
          PubSubManager.unsubscribeAll(eventType);
        }
      }
    }

    sessionIdToEventTypes.delete(sessionId);
  },

  async broadcastDataImpl(
    eventName: string,
    eventParams: JsonObj,
    data: SseData,
  ) {
    const eventType = serializeSseEvent(eventName, eventParams);
    const successResponse = await formatApiSuccessResponse<any>(data);
    // todo: mid/mid validate SSE data
    const processedData: SseResponse = {
      eventType,
      ...successResponse,
    };
    const dataStr = JSON.stringify(processedData);

    SseBroadcastManager.sendToConnections(eventType, dataStr);
    PubSubManager.publish(
      `sse:${eventType}`,
      dataStr,
    );
  },

  broadcastData(
    eventName: string,
    eventParams: JsonObj,
    data: SseData,
  ) {
    wrapPromise(
      this.broadcastDataImpl(eventName, eventParams, data),
      'error',
      eventName,
    );
  },

  sendToConnections(eventType: string, data: string) {
    const sessionIds = eventTypesToSessionIds.get(eventType);
    if (!sessionIds?.size) {
      return;
    }

    for (const sessionId of sessionIds) {
      SseConnectionsManager.sendMessage(sessionId, data);
    }
  },

  sendHeartbeats() {
    for (const [sessionId, eventTypes] of sessionIdToEventTypes) {
      const data: SseResponse = {
        eventType: serializeSseEvent('sseHeartbeat', {}),
        status: 200,
        data: {
          subbedEventTypes: [...eventTypes],
        },
        entities: [],
      };
      SseConnectionsManager.sendMessage(
        sessionId,
        JSON.stringify(data),
      );
    }

    setTimeout(
      () => SseBroadcastManager.sendHeartbeats(),
      60 * 1000,
    );
  },
};

if (!cluster.isMaster || NUM_CLUSTER_SERVERS === 1) {
  // User called `subscribe` API and connected to different server.
  PubSubManager.subscribe(SUBSCRIBE_EVENT_NAME, (msg: string) => {
    let data: SubUnsubMessage;
    try {
      data = JSON.parse(msg);
    } catch {
      ErrorLogger.error(new Error(`${SUBSCRIBE_EVENT_NAME}: msg isn't JSON`), { msg });
      return;
    }

    if (data?.sessionId && SseConnectionsManager.getConn(data.sessionId)) {
      SseBroadcastManager.subscribeRaw(data.sessionId, data.eventType);
    }
  });

  PubSubManager.subscribe(UNSUBSCRIBE_EVENT_NAME, (msg: string) => {
    let data: SubUnsubMessage;
    try {
      data = JSON.parse(msg);
    } catch {
      ErrorLogger.error(new Error(`${UNSUBSCRIBE_EVENT_NAME}: msg isn't JSON`), { msg });
      return;
    }

    if (data?.sessionId && SseConnectionsManager.getConn(data.sessionId)) {
      SseBroadcastManager.unsubscribeRaw(data.sessionId, data.eventType);
    }
  });

  setTimeout(
    () => SseBroadcastManager.sendHeartbeats(),
    60 * 1000,
  );
}

export default SseBroadcastManager;

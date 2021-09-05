import SseConnectionsManager from 'services/SseConnectionsManager';
import PubSubManager from 'services/PubSubManager';
import serializeEvent from 'lib/serializeEvent';

type SubUnsubMessage = {
  sessionId: string,
  eventType: string,
};

const SUBSCRIBE_EVENT_NAME = 'SseManager.subscribe';
const UNSUBSCRIBE_EVENT_NAME = 'SseManager.unsubscribe';

const sessionIdToEventTypes = Object.create(null) as ObjectOf<Set<string>>;
const eventTypesToSessionIds = Object.create(null) as ObjectOf<Set<string>>;

const SseBroadcastManager = {
  subscribe(sessionId: string, eventName: string, eventParams: Pojo) {
    if ((!eventName || !eventParams) && process.env.NODE_ENV !== 'production') {
      throw new Error('SseBroadcastManager.subscribe: invalid params.');
    }
    const eventType = serializeEvent(eventName, eventParams);
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

    const eventTypes = TS.objValOrSetDefault(sessionIdToEventTypes, sessionId, new Set());
    const sessionIds = TS.objValOrSetDefault(eventTypesToSessionIds, eventType, new Set());
    if (!sessionIds.size) {
      PubSubManager.subscribe(
        eventType,
        (data: string) => SseBroadcastManager.handleData(eventType, data),
      );
    }
    eventTypes.add(eventType);
    sessionIds.add(sessionId);
  },

  unsubscribe(sessionId: string, eventName: string, eventParams: Pojo) {
    const eventType = serializeEvent(eventName, eventParams);
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

    const eventTypes = sessionIdToEventTypes[sessionId];
    if (eventTypes) {
      eventTypes.delete(eventType);
      if (!eventTypes.size) {
        delete sessionIdToEventTypes[sessionId];
      }
    }

    const sessionIds = eventTypesToSessionIds[eventType];
    if (sessionIds) {
      sessionIds.delete(sessionId);
      if (!sessionIds.size) {
        delete eventTypesToSessionIds[eventType];
        PubSubManager.unsubscribeAll(eventType);
      }
    }
  },

  unsubscribeAll(sessionId: string) {
    if (!TS.hasDefinedProperty(sessionIdToEventTypes, sessionId)) {
      return;
    }

    for (const eventType of sessionIdToEventTypes[sessionId]) {
      const sessionIds = eventTypesToSessionIds[eventType];
      if (sessionIds) {
        sessionIds.delete(sessionId);
        if (!sessionIds.size) {
          delete eventTypesToSessionIds[eventType];
          PubSubManager.unsubscribeAll(eventType);
        }
      }
    }

    delete sessionIdToEventTypes[sessionId];
  },

  broadcastData(
    eventName: string,
    eventParams: Pojo,
    // todo: mid/hard unify with api data format.
    { data = null, entities, included = null, meta = null }: {
      data?: any,
      entities: Entity[] | Entity,
      included?: Entity[] | Entity | null,
      meta?: any,
    },
  ) {
    const eventType = serializeEvent(eventName, eventParams);
    const dataStr = JSON.stringify({
      type: eventType,
      ...data && { data },
      entities,
      ...included && { included },
      ...meta && { meta },
    });

    SseBroadcastManager.handleData(eventType, dataStr);
    PubSubManager.publish(
      eventType,
      dataStr,
    );
  },

  handleData(eventType: string, data: string) {
    if (!TS.hasDefinedProperty(eventTypesToSessionIds, eventType)) {
      return;
    }

    for (const sessionId of eventTypesToSessionIds[eventType]) {
      SseConnectionsManager.sendMessage(sessionId, data);
    }
  },
};

// User called `subscribe` API and connected to different server.
PubSubManager.subscribe(SUBSCRIBE_EVENT_NAME, (msg: string) => {
  let data: SubUnsubMessage;
  try {
    data = JSON.parse(msg);
  } catch {
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
    return;
  }

  if (data?.sessionId && SseConnectionsManager.getConn(data.sessionId)) {
    SseBroadcastManager.unsubscribeRaw(data.sessionId, data.eventType);
  }
});

export default SseBroadcastManager;

import SseConnectionsManager from 'services/sse/SseConnectionsManager';
import PubSubManager from 'services/PubSubManager';
import serializeSseEvent from 'utils/serializeSseEvent';
import formatApiSuccessResponse from 'routes/apis/formatApiSuccessResponse';
import { canSubscribeToSse } from 'config/functions';
import fastJson from 'services/fastJson';
import isSecondaryServer from 'utils/isSecondaryServer';

type SubUnsubMessage = {
  sessionId: string,
  eventTypes: string[],
};

const stringifyMsg = fastJson({
  type: 'object',
  properties: {
    sessionId: { type: 'string' },
    eventTypes: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  additionalProperties: false,
});

export type SseData = Pick<
  ApiRouteRet<any>,
  'entities' | 'createdEntities' | 'updatedEntities' | 'deletedIds'
> & {
  // temp
  data: any,
};

const SUBSCRIBE_EVENT_NAME = 'SseBroadcastManager.subscribe';
const UNSUBSCRIBE_EVENT_NAME = 'SseBroadcastManager.unsubscribe';
const MAX_EVENTS_PER_CONNECTION = 50;

const sessionIdToEventTypes = new Map<string, Set<string>>();
const eventTypesToSessionIds = new Map<string, Set<string>>();

const SseBroadcastManager = {
  async subscribe(
    sessionId: string,
    events: { name: string, params: JsonObj }[],
    currentUserId: Nullish<EntityId>,
  ) {
    if (!process.env.PRODUCTION && events.some(e => !e.name || !e.params)) {
      throw new Error('SseBroadcastManager.subscribe: invalid params.');
    }

    const canSub = await Promise.all(events.map(
      e => canSubscribeToSse(e.name, e.params, currentUserId),
    ));
    const cantSubIdx = canSub.findIndex(c => !c);
    if (cantSubIdx >= 0) {
      ErrorLogger.warn(
        new Error(`SseBroadcastManager.subscribe: couldn't subscribe to ${events[cantSubIdx].name}`),
      );
      events = events.filter((_, i) => canSub[i]);
      if (!events.length) {
        return;
      }
    }

    const eventTypes = events.map(e => serializeSseEvent(e.name, e.params));
    const conn = SseConnectionsManager.getConn(sessionId);
    if (!conn) {
      PubSubManager.publish(SUBSCRIBE_EVENT_NAME, stringifyMsg({
        sessionId,
        eventTypes,
      }));
      return;
    }

    SseBroadcastManager.subscribeSameServer(sessionId, eventTypes);
  },

  subscribeSameServer(sessionId: string, eventTypes: string[]) {
    const sessionEventTypes = TS.mapValOrSetDefault(sessionIdToEventTypes, sessionId, new Set());

    for (const eventType of eventTypes) {
      const eventSessionIds = TS.mapValOrSetDefault(eventTypesToSessionIds, eventType, new Set());
      if (!eventSessionIds.size) {
        PubSubManager.subscribe(
          `sse:${eventType}`,
          (data: string) => SseBroadcastManager.sendToConnections(eventType, data),
        );
      }
      if (sessionEventTypes.size >= MAX_EVENTS_PER_CONNECTION) {
        ErrorLogger.warn(getErr(
          'SseBroadcastManager.subscribeSameServer: session reached max events',
          { eventTypes: [...sessionEventTypes] },
        ));
        break;
      }

      sessionEventTypes.add(eventType);
      eventSessionIds.add(sessionId);
    }
  },

  unsubscribe(sessionId: string, events: { name: string, params: JsonObj }[]) {
    const eventTypes = events.map(e => serializeSseEvent(e.name, e.params));
    const conn = SseConnectionsManager.getConn(sessionId);
    if (!conn) {
      PubSubManager.publish(UNSUBSCRIBE_EVENT_NAME, stringifyMsg({
        sessionId,
        eventTypes,
      }));
      return;
    }

    SseBroadcastManager.unsubscribeSameServer(sessionId, eventTypes);
  },

  unsubscribeSameServer(sessionId: string, eventTypes: string[]) {
    const subbedEventTypes = sessionIdToEventTypes.get(sessionId);
    if (subbedEventTypes) {
      for (const eventType of eventTypes) {
        subbedEventTypes.delete(eventType);
      }
      if (!subbedEventTypes.size) {
        sessionIdToEventTypes.delete(sessionId);
      }
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
    eventParams: JsonObj | JsonObj[],
    data: SseData,
  ) {
    const successResponse = await formatApiSuccessResponse('sse' as any, data);
    const eventTypes = Array.isArray(eventParams)
      ? eventParams.map(params => serializeSseEvent(eventName, params))
      : [serializeSseEvent(eventName, eventParams)];
    for (const eventType of eventTypes) {
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
    }
  },

  broadcastData(
    eventName: string,
    eventParams: JsonObj | JsonObj[],
    data: SseData,
  ) {
    wrapPromise(
      this.broadcastDataImpl(eventName, eventParams, data),
      'error',
      `Sse.broadcastData: ${eventName}`,
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
    for (const pair of sessionIdToEventTypes.entries()) {
      const data: SseResponse = {
        eventType: serializeSseEvent('sseHeartbeat', {}),
        status: 200,
        data: {
          subbedEventTypes: [...pair[1]],
        },
        entities: [],
      };
      SseConnectionsManager.sendMessage(
        pair[0],
        JSON.stringify(data),
      );
    }

    setTimeout(
      () => SseBroadcastManager.sendHeartbeats(),
      60 * 1000,
    );
  },
};

if (isSecondaryServer) {
  setTimeout(() => {
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
        SseBroadcastManager.subscribeSameServer(data.sessionId, data.eventTypes);
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
        SseBroadcastManager.unsubscribeSameServer(data.sessionId, data.eventTypes);
      }
    });
  }, 0);

  setTimeout(
    () => SseBroadcastManager.sendHeartbeats(),
    60 * 1000,
  );
}

export default SseBroadcastManager;

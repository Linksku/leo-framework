import type { SseName, SseParams, SseData } from 'config/sse';
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

export type SseResponseData<Name extends SseName> = Pick<
  ApiRouteRet<any>,
  'entities' | 'createdEntities' | 'updatedEntities' | 'deletedIds'
> & {
  data: SseData[Name],
};

export type SseResponseSerialized<Name extends SseName> = Pick<
ApiSuccessResponse<any>,
  'entities' | 'createdEntities' | 'updatedEntities' | 'deletedIds' | 'status'
> & {
  data: SseData[Name],
  eventType: string,
};

const SUBSCRIBE_EVENT_NAME = 'SseBroadcastManager.subscribe';
const UNSUBSCRIBE_EVENT_NAME = 'SseBroadcastManager.unsubscribe';
const MAX_EVENTS_PER_CONNECTION = 50;

const sessionIdToEventTypes = new Map<string, Set<string>>();
const eventTypesToSessionIds = new Map<string, Set<string>>();

const SseBroadcastManager = {
  async subscribe(
    sessionId: string,
    events: { name: SseName, params: SseParams[SseName] }[],
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

    SseBroadcastManager._subscribeSameServer(sessionId, eventTypes);
  },

  _subscribeSameServer(sessionId: string, eventTypes: string[]) {
    const sessionEventTypes = TS.mapValOrSetDefault(sessionIdToEventTypes, sessionId, new Set());

    for (const eventType of eventTypes) {
      const eventSessionIds = TS.mapValOrSetDefault(eventTypesToSessionIds, eventType, new Set());
      if (!eventSessionIds.size) {
        PubSubManager.subscribe(
          `sse:${eventType}`,
          (data: string) => SseBroadcastManager._sendToSameServer(eventType, data),
        );
      }
      if (sessionEventTypes.size >= MAX_EVENTS_PER_CONNECTION) {
        ErrorLogger.warn(getErr(
          'SseBroadcastManager._subscribeSameServer: session reached max events',
          { eventTypes: [...sessionEventTypes] },
        ));
        break;
      }

      sessionEventTypes.add(eventType);
      eventSessionIds.add(sessionId);
    }
  },

  unsubscribe(sessionId: string, events: { name: SseName, params: SseParams[SseName] }[]) {
    const eventTypes = events.map(e => serializeSseEvent(e.name, e.params));
    const conn = SseConnectionsManager.getConn(sessionId);
    if (!conn) {
      PubSubManager.publish(UNSUBSCRIBE_EVENT_NAME, stringifyMsg({
        sessionId,
        eventTypes,
      }));
      return;
    }

    SseBroadcastManager._unsubscribeSameServer(sessionId, eventTypes);
  },

  _unsubscribeSameServer(sessionId: string, eventTypes: string[]) {
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

  async _sendImpl<Name extends SseName>(
    eventName: Name,
    eventParams: SseParams[Name] | SseParams[Name][],
    data: SseResponseData<Name>,
  ) {
    const successResponse = await formatApiSuccessResponse('sse' as any, data);
    const eventTypes = Array.isArray(eventParams)
      ? eventParams.map(params => serializeSseEvent(eventName, params))
      : [serializeSseEvent(eventName, eventParams)];
    for (const eventType of eventTypes) {
      // todo: med/med validate SSE data
      const processedData: SseResponseSerialized<Name> = {
        eventType,
        ...successResponse,
      };
      const dataStr = JSON.stringify(processedData);

      SseBroadcastManager._sendToSameServer(eventType, dataStr);
      PubSubManager.publish(
        `sse:${eventType}`,
        dataStr,
      );
    }
  },

  send<Name extends SseName>(
    eventName: Name,
    eventParams: SseParams[Name] | SseParams[Name][],
    data: SseResponseData<Name>,
  ) {
    wrapPromise(
      this._sendImpl(eventName, eventParams, data),
      'error',
      `Sse._sendImpl: ${eventName}`,
    );
  },

  _sendToSameServer(eventType: string, data: string) {
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
      const data: SseResponseSerialized<'sseHeartbeat'> = {
        eventType: serializeSseEvent('sseHeartbeat'),
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
        SseBroadcastManager._subscribeSameServer(data.sessionId, data.eventTypes);
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
        SseBroadcastManager._unsubscribeSameServer(data.sessionId, data.eventTypes);
      }
    });
  }, 0);

  setTimeout(
    () => SseBroadcastManager.sendHeartbeats(),
    60 * 1000,
  );
}

export default SseBroadcastManager;

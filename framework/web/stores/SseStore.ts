import SseEventEmitter from 'services/SseEventEmitter';
import serializeSseEvent, { unserializeSseEvent } from 'utils/serializeSseEvent';
import { API_URL } from 'settings';
import useHandleApiEntities from 'utils/hooks/useApi/useHandleApiEntities';
import deepFreezeIfDev from 'utils/deepFreezeIfDev';
import { useThrottle } from 'utils/throttle';

export const [
  SseProvider,
  useSseStore,
] = constate(
  function SseStore() {
    const ref = useRef({
      subscriptions: Object.create(null) as ObjectOf<{
        serializedEventName: string;
        name: string,
        params: Memoed<JsonObj>
        numSubscribers: number,
      }>,
      readyState: EventSource.CLOSED,
      numReconnects: 0,
      lastReconnectTime: 0,
      reconnectTimer: 0,
      subscribeTimer: null as number | null,
      unsubscribeTimer: null as number | null,
      // Vars below are tied to 1 EventSource instance.
      source: null as EventSource | null,
      queuedSubs: new Set<string>(),
      queuedUnsubs: new Set<string>(),
      sessionId: null as string | null,
    });
    const { authToken } = useAuthStore();
    const { refetch } = useApiStore();
    const handleApiEntities = useHandleApiEntities(true);

    const { fetchApi: sseSubscribe } = useDeferredApi(
      'sseSubscribe',
      EMPTY_OBJ,
      {
        type: 'load',
        method: 'post',
        showToastOnError: false,
      },
    );

    const { fetchApi: sseUnsubscribe } = useDeferredApi(
      'sseUnsubscribe',
      EMPTY_OBJ,
      {
        type: 'load',
        method: 'post',
        showToastOnError: false,
      },
    );

    const closeSse = useCallback(() => {
      ref.current.source?.close();
      ref.current.source = null;
      ref.current.readyState = EventSource.CLOSED;
      ref.current.sessionId = null;
      window.clearTimeout(ref.current.reconnectTimer);
    }, []);

    useApi(
      'sseOtp',
      EMPTY_OBJ,
      {
        shouldFetch: !!authToken,
        onFetch({ otp }) {
          // eslint-disable-next-line @typescript-eslint/no-use-before-define
          createEventSource(otp);
        },
        refetchOnFocus: false,
      },
    );

    const createEventSource = useCallback((otp: string | null) => {
      closeSse();

      const events = [...ref.current.queuedSubs]
        .map(name => TS.defined(ref.current.subscriptions[name]))
        .filter(sub => sub.numSubscribers > 0)
        .map(sub => ({ name: sub.name, params: sub.params }));
      ref.current.queuedSubs.clear();
      // todo: low/mid handle removing subscription while connecting to /sse
      const source = new EventSource(
        `${API_URL}/sse?params=${encodeURIComponent(JSON.stringify({
          otp,
          events,
        }))}`,
        {
          withCredentials: true,
        },
      );
      ref.current.source = source;
      ref.current.readyState = EventSource.CONNECTING;

      source.addEventListener('message', msg => {
        let parsed: any;
        try {
          parsed = JSON.parse(msg.data);
        } catch {
          ErrorLogger.warn(new Error(`SseStore: can't parse SSE data: ${msg.data.slice(0, 200)}`));
          return;
        }

        if (!parsed
          || typeof parsed !== 'object'
          || typeof parsed.eventType !== 'string'
          || !TS.hasOwnProp(parsed, 'data')) {
          ErrorLogger.warn(new Error(`SseStore: invalid SSE data: ${msg.data.slice(0, 200)}`));
          return;
        }
        const data = parsed as unknown as MemoDeep<SseResponse>;

        const { name, params } = unserializeSseEvent(data.eventType);
        handleApiEntities(data);
        SseEventEmitter.emit(name, deepFreezeIfDev(data.data), params);
      });

      source.addEventListener('open', () => {
        ref.current.readyState = EventSource.OPEN;
      });

      source.addEventListener('error', event => {
        // Error event doesn't contain additional info.
        if (event instanceof ErrorEvent) {
          ErrorLogger.warn(event.error);
        }

        closeSse();

        for (const sub of Object.keys(ref.current.subscriptions)) {
          ref.current.queuedSubs.add(sub);
        }

        let timeout = Math.min(5 * 60 * 1000, 1000 * (2 ** ref.current.numReconnects));
        // This is needed because WS can disconnect right after connecting.
        if (performance.now() - ref.current.lastReconnectTime > timeout) {
          ref.current.numReconnects = 0;
          timeout = 1000;
        }

        ref.current.reconnectTimer = window.setTimeout(
          () => refetch('sseOtp', {}),
          timeout,
        );
        ref.current.numReconnects++;
        ref.current.lastReconnectTime = performance.now();
      });
    }, [closeSse, handleApiEntities, refetch]);

    const processQueuedSubs = useThrottle(
      () => {
        if (ref.current.subscribeTimer === null) {
          ref.current.subscribeTimer = setTimeout(() => {
            if (!authToken && !ref.current.source) {
              // OTP is needed for auth, not for connecting to SSE.
              createEventSource(null);
            } else if (ref.current.readyState === EventSource.OPEN
              && ref.current.sessionId) {
              const events = [...ref.current.queuedSubs]
                .map(name2 => TS.defined(ref.current.subscriptions[name2]))
                .filter(sub2 => sub2.numSubscribers > 0)
                .map(sub2 => ({ name: sub2.name, params: sub2.params }));
              if (events.length) {
                sseSubscribe({
                  sessionId: ref.current.sessionId,
                  events,
                });
              }
              ref.current.queuedSubs.clear();
            } else if (!process.env.PRODUCTION && ref.current.readyState === EventSource.OPEN) {
              ErrorLogger.warn(new Error('SseStore: unhandled add SSE state'));
            }

            ref.current.subscribeTimer = null;
          }, 0);
        }
      },
      useConst({
        timeout: 100,
      }),
      [authToken, createEventSource, sseSubscribe],
    );

    const processQueuedUnsubs = useThrottle(
      () => {
        if (ref.current.unsubscribeTimer === null) {
          ref.current.unsubscribeTimer = setTimeout(() => {
            if (ref.current.readyState !== EventSource.CLOSED
              && TS.objValues(ref.current.subscriptions).every(s => s.numSubscribers === 0)) {
              closeSse();
            } else if (ref.current.readyState === EventSource.OPEN
              && ref.current.sessionId) {
              const events = [...ref.current.queuedUnsubs]
                .map(name2 => TS.defined(ref.current.subscriptions[name2]))
                .filter(sub2 => sub2.numSubscribers === 0)
                .map(sub2 => ({ name: sub2.name, params: sub2.params }));
              if (events.length) {
                sseUnsubscribe({
                  sessionId: ref.current.sessionId,
                  events: [...ref.current.queuedUnsubs]
                    .map(eventName => unserializeSseEvent(eventName)),
                });
              }
              ref.current.queuedUnsubs.clear();
            } else if (!process.env.PRODUCTION && ref.current.readyState === EventSource.OPEN) {
              ErrorLogger.warn(new Error('SseStore: unhandled remove SSE state'));
            }

            ref.current.unsubscribeTimer = null;
          }, 0);
        }
      },
      useConst({
        timeout: 100,
      }),
      [closeSse, sseUnsubscribe],
    );

    const addSubscription = useCallback((name: string, params: Memoed<JsonObj>) => {
      const serializedEventName = serializeSseEvent(name, params);
      const sub = ref.current.subscriptions[serializedEventName];
      if (sub) {
        sub.numSubscribers++;
        if (sub.numSubscribers > 1) {
          return;
        }
      }

      ref.current.subscriptions[serializedEventName] = {
        serializedEventName,
        name,
        params,
        numSubscribers: sub?.numSubscribers ?? 1,
      };

      ref.current.queuedSubs.add(serializedEventName);
      ref.current.queuedUnsubs.delete(serializedEventName);

      processQueuedSubs();
    }, [processQueuedSubs]);

    const removeSubscription = useCallback((name: string, params: Memoed<JsonObj>) => {
      const serializedEventName = serializeSseEvent(name, params);
      const sub = ref.current.subscriptions[serializedEventName];
      if (!sub) {
        return;
      }

      sub.numSubscribers--;
      if (sub.numSubscribers > 0) {
        return;
      }

      ref.current.queuedSubs.delete(serializedEventName);
      ref.current.queuedUnsubs.add(serializedEventName);

      processQueuedUnsubs();
    }, [processQueuedUnsubs]);

    useEffect(() => {
      const handleConnect = (data: any) => {
        ref.current.sessionId = data?.sessionId ?? null;

        if (ref.current.sessionId) {
          processQueuedSubs();
        } else {
          closeSse();
        }
      };

      const handleHeartbeat = (data: any) => {
        const serverSubbedEventTypes = new Set(data.subbedEventTypes);
        const missingEventTypes = Object.keys(ref.current.subscriptions)
          .filter(eventType => !serverSubbedEventTypes.has(eventType));
        for (const eventType of missingEventTypes) {
          ref.current.queuedSubs.add(eventType);
        }

        if (missingEventTypes.length) {
          processQueuedSubs();
        }
      };

      // todo: low/mid types for sse
      SseEventEmitter.on('sseConnected', handleConnect);
      SseEventEmitter.on('sseHeartbeat', handleHeartbeat);

      return () => {
        SseEventEmitter.off('sseConnected', handleConnect);
        SseEventEmitter.off('sseHeartbeat', handleHeartbeat);
      };
    }, [processQueuedSubs, closeSse]);

    return useMemo(() => ({
      addSubscription,
      removeSubscription,
    }), [addSubscription, removeSubscription]);
  },
);

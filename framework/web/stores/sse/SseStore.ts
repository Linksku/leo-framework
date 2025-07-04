import type { SseData, SseName, SseParams } from 'config/sse';
import SseEventEmitter from 'services/SseEventEmitter';
import serializeSseEvent, { unserializeSseEvent } from 'utils/serializeSseEvent';
import { DEFAULT_API_TIMEOUT, API_URL } from 'consts/server';
import useHandleApiEntities from 'stores/api/useHandleApiEntities';
import deepFreezeIfDev from 'utils/deepFreezeIfDev';
import { useThrottle } from 'utils/throttle';
import safeParseJson from 'utils/safeParseJson';
import isDebug from 'utils/isDebug';
import getUrlParams from 'utils/getUrlParams';
import stringify from 'utils/stringify';
import useDocumentEvent from 'utils/useDocumentEvent';

const SseState = {
  subscriptions: new Map<
    string,
    {
      serializedEventName: string,
      name: SseName,
      params: Stable<SseParams[SseName]>,
      numSubscribers: number,
    }
  >(),
  readyState: EventSource.CLOSED as number,
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
  shownOfflineToast: false,
  offlineToastTimer: null as number | null,
  lastFocusTabTime: Number.MIN_SAFE_INTEGER,
};

export const [
  SseProvider,
  useSseStore,
] = constate(
  function SseStore() {
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

    useDocumentEvent('visibilitychange', useCallback(() => {
      if (document.visibilityState === 'visible') {
        SseState.lastFocusTabTime = performance.now();
      }
    }, []));

    const closeSse = useCallback(() => {
      SseState.source?.close();
      SseState.source = null;
      SseState.readyState = EventSource.CLOSED;
      SseState.sessionId = null;
      window.clearTimeout(SseState.reconnectTimer);

      if (!SseState.offlineToastTimer && !SseState.shownOfflineToast) {
        SseState.offlineToastTimer = window.setTimeout(() => {
          showToast({
            msg: 'Offline',
            closeAfter: 1000,
          });
          SseState.shownOfflineToast = true;
          SseState.offlineToastTimer = null;
        }, DEFAULT_API_TIMEOUT);
      }
    }, []);

    const reconnectAfterDelay = useCallback(() => {
      // This is needed because WS can disconnect right after connecting.
      const prevDelay = Math.min(60 * 1000, 1000 * (2 ** (SseState.numReconnects - 1)));
      if (performance.now() - SseState.lastReconnectTime > prevDelay + DEFAULT_API_TIMEOUT) {
        SseState.numReconnects = 0;
      }

      const delay = Math.min(60 * 1000, 1000 * (2 ** SseState.numReconnects));
      SseState.reconnectTimer = window.setTimeout(
        () => refetch('sseOtp', {}),
        delay,
      );

      SseState.numReconnects++;
      SseState.lastReconnectTime = performance.now();
    }, [refetch]);

    useApi(
      'sseOtp',
      EMPTY_OBJ,
      {
        shouldFetch: !!authToken,
        onFetch({ otp }) {
          // eslint-disable-next-line @typescript-eslint/no-use-before-define
          createEventSource(otp);
        },
        onError() {
          reconnectAfterDelay();
        },
        refetchOnFocus: false,
        showToastOnError: false,
      },
    );

    const createEventSource = useCallback((otp: string | null) => {
      if (SseState.source) {
        closeSse();
      }

      const events = [...SseState.queuedSubs]
        .map(name => TS.defined(SseState.subscriptions.get(name)))
        .filter(sub => sub.numSubscribers > 0)
        .map(sub => ({ name: sub.name, params: sub.params }));
      SseState.queuedSubs.clear();

      let url = `${API_URL}/sse?params=${encodeURIComponent(JSON.stringify({
        otp,
        events,
      }))}`;
      if (isDebug || !!getUrlParams().get('debug')) {
        url += '&DEBUG=1';
      }

      // todo: low/med handle removing subscription while connecting to /sse
      const source = new EventSource(
        url,
        {
          withCredentials: true,
        },
      );
      SseState.source = source;
      SseState.readyState = EventSource.CONNECTING;

      source.addEventListener('message', msg => {
        const parsed = safeParseJson<SseResponse>(
          msg.data,
          val => TS.isObj(val) && typeof val.eventType === 'string',
        );
        if (!parsed || !TS.hasProp(parsed, 'data')) {
          ErrorLogger.warn(new Error(`SseStore: invalid SSE data: ${stringify(msg.data).slice(0, 200)}`));
          return;
        }

        const data = parsed as unknown as StableDeep<SseResponse>;
        const { params } = unserializeSseEvent(data.eventType);
        handleApiEntities(data);
        SseEventEmitter.emit(data.eventType, deepFreezeIfDev(data.data), params);
      });

      source.addEventListener('open', () => {
        if (!process.env.PRODUCTION && SseState.readyState === EventSource.OPEN) {
          ErrorLogger.warn(new Error('SseStore: opened SSE without closing old'));
        }
        SseState.readyState = EventSource.OPEN;

        if (SseState.offlineToastTimer) {
          clearTimeout(SseState.offlineToastTimer);
          SseState.offlineToastTimer = null;
        }

        if (SseState.shownOfflineToast
          && performance.now() - SseState.lastFocusTabTime > DEFAULT_API_TIMEOUT) {
          showToast({
            msg: 'Online',
            closeAfter: 1000,
          });
        }
        SseState.shownOfflineToast = false;
      });

      source.addEventListener('error', event => {
        // Error event doesn't contain additional info.
        if (event instanceof ErrorEvent) {
          ErrorLogger.warn(event.error);
        }

        closeSse();

        for (const sub of SseState.subscriptions.keys()) {
          SseState.queuedSubs.add(sub);
        }

        reconnectAfterDelay();
      });
    }, [closeSse, handleApiEntities, reconnectAfterDelay]);

    const processQueuedSubs = useThrottle(
      () => {
        if (SseState.subscribeTimer) {
          return;
        }

        SseState.subscribeTimer = window.setTimeout(() => {
          if (!authToken && !SseState.source) {
            // OTP is needed for auth, not for connecting to SSE.
            createEventSource(null);
          } else if (SseState.readyState === EventSource.OPEN
            && SseState.sessionId) {
            const events = [...SseState.queuedSubs]
              .map(name2 => TS.defined(SseState.subscriptions.get(name2)))
              .filter(sub2 => sub2.numSubscribers > 0)
              .map(sub2 => ({ name: sub2.name, params: sub2.params }));
            if (events.length) {
              sseSubscribe({
                sessionId: SseState.sessionId,
                events,
              });
            }
            SseState.queuedSubs.clear();
          } else if (!process.env.PRODUCTION && SseState.readyState === EventSource.OPEN) {
            ErrorLogger.warn(new Error('SseStore: unhandled add SSE state'));
          }

          SseState.subscribeTimer = null;
        }, 0);
      },
      useConst({
        timeout: 100,
      }),
      [authToken, createEventSource, sseSubscribe],
    );

    const processQueuedUnsubs = useThrottle(
      () => {
        if (SseState.unsubscribeTimer) {
          return;
        }

        SseState.unsubscribeTimer = window.setTimeout(() => {
          if (SseState.readyState !== EventSource.CLOSED
            && [...SseState.subscriptions.values()].every(s => s.numSubscribers === 0)) {
            closeSse();
          } else if (SseState.readyState === EventSource.OPEN
            && SseState.sessionId) {
            const events = [...SseState.queuedUnsubs]
              .map(name2 => TS.defined(SseState.subscriptions.get(name2)))
              .filter(sub2 => sub2.numSubscribers === 0)
              .map(sub2 => ({ name: sub2.name, params: sub2.params }));
            if (events.length) {
              sseUnsubscribe({
                sessionId: SseState.sessionId,
                events: [...SseState.queuedUnsubs]
                  .map(eventName => unserializeSseEvent(eventName)),
              });
            }
            SseState.queuedUnsubs.clear();
          } else if (!process.env.PRODUCTION && SseState.readyState === EventSource.OPEN) {
            ErrorLogger.warn(new Error('SseStore: unhandled remove SSE state'));
          }

          SseState.unsubscribeTimer = null;
        }, 0);
      },
      useConst({
        timeout: 100,
      }),
      [closeSse, sseUnsubscribe],
    );

    const addSubscription = useCallback(<Name extends SseName>(
      name: Name,
      params: Stable<SseParams[Name]>,
      cb?: Stable<(data: SseData[Name]) => void>,
    ) => {
      const serializedEventName = serializeSseEvent(name, params);

      if (cb) {
        SseEventEmitter.on(serializedEventName, cb);
      }

      const sub = SseState.subscriptions.get(serializedEventName);
      if (sub) {
        sub.numSubscribers++;

        if (sub.numSubscribers > 1) {
          return;
        }
        if (!process.env.PRODUCTION) {
          // eslint-disable-next-line no-console
          console.log(`SseStore.addSubscription(${name}): negative subs`);
        }
      }

      if (!sub) {
        SseState.subscriptions.set(serializedEventName, {
          serializedEventName,
          name,
          params,
          numSubscribers: 1,
        });
      }

      SseState.queuedSubs.add(serializedEventName);
      SseState.queuedUnsubs.delete(serializedEventName);

      processQueuedSubs();
    }, [processQueuedSubs]);

    const removeSubscription = useCallback(<Name extends SseName>(
      name: Name,
      params: Stable<SseParams[Name]>,
      cb?: Stable<(data: SseData[Name]) => void>,
    ) => {
      const serializedEventName = serializeSseEvent(name, params);

      if (cb) {
        SseEventEmitter.off(serializedEventName, cb);
      }

      const sub = SseState.subscriptions.get(serializedEventName);
      if (!sub) {
        return;
      }

      sub.numSubscribers--;
      if (sub.numSubscribers > 0) {
        return;
      }

      SseState.queuedSubs.delete(serializedEventName);
      SseState.queuedUnsubs.add(serializedEventName);

      processQueuedUnsubs();
    }, [processQueuedUnsubs]);

    useEffect(() => {
      const handleConnect = (data: any) => {
        SseState.sessionId = TS.isObj(data)
          ? (data?.sessionId ?? null)
          : null;

        if (SseState.sessionId) {
          processQueuedSubs();
        } else {
          closeSse();
        }
      };

      const handleHeartbeat = (data: any) => {
        const serverSubbedEventTypes = new Set(
          TS.isObj(data)
            ? data.subbedEventTypes
            : [],
        );
        const missingEventTypes = [...SseState.subscriptions.keys()]
          .filter(eventType => !serverSubbedEventTypes.has(eventType));
        for (const eventType of missingEventTypes) {
          SseState.queuedSubs.add(eventType);
        }

        if (missingEventTypes.length) {
          processQueuedSubs();
        }
      };

      const sseConnectedEvent = serializeSseEvent('sseConnected');
      const sseHeartbeatEvent = serializeSseEvent('sseHeartbeat');
      SseEventEmitter.on(sseConnectedEvent, handleConnect);
      SseEventEmitter.on(sseHeartbeatEvent, handleHeartbeat);

      return () => {
        SseEventEmitter.off(sseConnectedEvent, handleConnect);
        SseEventEmitter.off(sseHeartbeatEvent, handleHeartbeat);
      };
    }, [processQueuedSubs, closeSse]);

    return useMemo(() => ({
      addSubscription,
      removeSubscription,
    }), [addSubscription, removeSubscription]);
  },
);

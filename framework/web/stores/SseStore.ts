import SseEventEmitter from 'services/SseEventEmitter';
import serializeEvent, { unserializeEvent } from 'utils/serializeEvent';
import { API_URL } from 'settings';
import useHandleApiEntities from 'utils/hooks/useApi/useHandleApiEntities';

export const [
  SseProvider,
  useSseStore,
] = constate(
  function SseStore() {
    const ref = useRef({
      subscriptions: new Set<string>(),
      readyState: EventSource.CLOSED,
      numReconnects: 0,
      lastReconnectTime: 0,
      reconnectTimer: 0,
      // Vars below are tied to 1 EventSource instance.
      source: null as EventSource | null,
      defaultSubbed: new Set<string>(),
      sessionId: null as string | null,
    });
    const { authToken } = useAuthStore();
    const { addRelationsConfigs } = useApiStore();
    const handleApiEntities = useHandleApiEntities(addRelationsConfigs, true);

    const { fetchApi: sseSubscribe } = useDeferredApi(
      'sseSubscribe',
      {},
      {
        type: 'load',
        method: 'post',
        noReturnState: true,
        showToastOnError: false,
      },
    );

    const { fetchApi: sseUnsubscribe } = useDeferredApi(
      'sseUnsubscribe',
      {},
      {
        type: 'load',
        method: 'post',
        noReturnState: true,
        showToastOnError: false,
      },
    );

    const closeSse = useCallback(() => {
      ref.current.source?.close();
      ref.current.readyState = EventSource.CLOSED;
      ref.current.sessionId = null;
      window.clearTimeout(ref.current.reconnectTimer);
    }, []);

    useEffect(() => {
      const handleConnect = (data: any) => {
        ref.current.sessionId = data?.sessionId ?? null;

        if (ref.current.sessionId) {
          const events = [...ref.current.subscriptions]
            .filter(sub => !ref.current.defaultSubbed.has(sub))
            .map(sub => unserializeEvent(sub));
          if (events.length) {
            void sseSubscribe({
              sessionId: ref.current.sessionId,
              events,
            });
          }
        } else {
          closeSse();
        }
      };

      // todo: low/mid types for sse
      SseEventEmitter.on('sseConnected', handleConnect);

      return () => {
        SseEventEmitter.off('sseConnected', handleConnect);
      };
    }, [sseSubscribe, closeSse]);

    const { refetch } = useApi('sseOtp', {}, {
      shouldFetch: !!authToken,
      onFetch({ otp }) {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        createEventSource(otp);
      },
      swrConfig: {
        refreshInterval: 24 * 60 * 60 * 1000,
        revalidateIfStale: false,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
      },
    });

    const createEventSource = useCallback((otp: string | null) => {
      closeSse();

      const source = new EventSource(
        `${API_URL}/sse?params=${encodeURIComponent(JSON.stringify({
          otp,
          events: [...ref.current.subscriptions].map(sub => unserializeEvent(sub)),
        }))}`,
        {
          withCredentials: true,
        },
      );
      ref.current.source = source;
      ref.current.readyState = EventSource.CONNECTING;
      ref.current.defaultSubbed = new Set(ref.current.subscriptions);

      source.addEventListener('message', msg => {
        let parsed: any;
        try {
          parsed = JSON.parse(msg.data);
        } catch {
          ErrorLogger.warn(new Error(`Can't parse SSE data: ${msg.data.slice(0, 200)}`));
          return;
        }

        if (!parsed
          || typeof parsed !== 'object'
          || typeof parsed.eventType !== 'string'
          || !TS.hasOwnProp(parsed, 'data')) {
          ErrorLogger.warn(new Error(`Invalid SSE data: ${msg.data.slice(0, 200)}`));
          return;
        }
        const data = parsed as unknown as MemoDeep<SseResponse>;

        const { name, params } = unserializeEvent(data.eventType);
        batchedUpdates(() => {
          handleApiEntities(data);
          SseEventEmitter.emit(name, data.data, params);
        });
      });

      source.addEventListener('open', () => {
        ref.current.readyState = EventSource.OPEN;
      });

      source.addEventListener('error', err => {
        // Error event doesn't contain additional info.
        ErrorLogger.warn(
          err instanceof ErrorEvent ? err.error : new Error('SseStore: error event'),
        );

        closeSse();

        let timeout = Math.min(5 * 60 * 1000, 1000 * (2 ** ref.current.numReconnects));
        // This is needed because WS can disconnect right after connecting.
        if (performance.now() - ref.current.lastReconnectTime > timeout) {
          ref.current.numReconnects = 0;
          timeout = 1000;
        }

        ref.current.reconnectTimer = window.setTimeout(
          refetch,
          timeout,
        );
        ref.current.numReconnects++;
        ref.current.lastReconnectTime = performance.now();
      });
    }, [closeSse, handleApiEntities, refetch]);

    const addSubscription = useCallback((name: string, params: Memoed<Pojo>) => {
      const event = serializeEvent(name, params);
      const hasSubbed = ref.current.subscriptions.has(event);
      ref.current.subscriptions.add(event);

      if (ref.current.readyState === EventSource.CLOSED && !authToken) {
        // OTP is needed for auth, not for connecting to SSE.
        createEventSource(null);
      } else if (ref.current.readyState === EventSource.OPEN
        && !hasSubbed
        && ref.current.sessionId) {
        void sseSubscribe({
          sessionId: ref.current.sessionId,
          events: [{ name, params }],
        });
      }
    }, [authToken, createEventSource, sseSubscribe]);

    const removeSubscription = useCallback((name: string, params: Memoed<Pojo>) => {
      const event = serializeEvent(name, params);
      const hasSubbed = ref.current.subscriptions.has(event);
      ref.current.subscriptions.delete(serializeEvent(name, params));

      if (ref.current.readyState !== EventSource.CLOSED
        && !ref.current.subscriptions.size) {
        closeSse();
      } else if (ref.current.readyState === EventSource.OPEN
        && ref.current.sessionId
        && hasSubbed) {
        void sseUnsubscribe({
          sessionId: ref.current.sessionId,
          events: [{ name, params }],
        });
      }
    }, [closeSse, sseUnsubscribe]);

    return useDeepMemoObj({
      addSubscription,
      removeSubscription,
    });
  },
);

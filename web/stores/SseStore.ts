import SseEventEmitter from 'lib/singletons/SseEventEmitter';
import serializeEvent, { unserializeEvent } from 'lib/serializeEvent';
import { API_URL } from 'settings';
import useHandleApiEntities from 'lib/hooks/useApi/useHandleApiEntities';

const ReadyState = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSED: 2,
};

const [
  SseProvider,
  useSseStore,
] = constate(
  function SseStore() {
    const ref = useRef({
      subscriptions: new Set<string>(),
      readyState: ReadyState.CLOSED,
      numReconnects: 0,
      lastReconnectTime: 0,
      reconnectTimer: 0,
      // Vars below are tied to 1 EventSource instance.
      source: null as EventSource | null,
      defaultSubbed: new Set<string>(),
      sessionId: null as string | null,
    });
    const { authToken } = useAuthStore();
    const handleApiEntities = useHandleApiEntities(true);

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
      'sseSubscribe',
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
      ref.current.readyState = ReadyState.CLOSED;
      ref.current.sessionId = null;
      window.clearTimeout(ref.current.reconnectTimer);
    }, []);

    useEffect(() => {
      // todo: low/mid types for sse
      SseEventEmitter.on(
        'sseConnected',
        (data: any) => {
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
        },
      );
    }, [sseSubscribe, closeSse]);

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
      ref.current.readyState = ReadyState.CONNECTING;
      ref.current.defaultSubbed = new Set(ref.current.subscriptions);

      source.addEventListener('message', msg => {
        let parsed: any;
        try {
          parsed = JSON.parse(msg.data);
        } catch {
          ErrorLogger.warning(new Error(`Can't parse SSE data: ${msg.data.slice(0, 200)}`));
          return;
        }

        if (!parsed
          || !TS.hasDefinedProperty(parsed, 'eventType')
          || !TS.hasProperty(parsed, 'data')) {
          ErrorLogger.warning(new Error(`Invalid SSE data: ${msg.data.slice(0, 200)}`));
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
        ref.current.readyState = ReadyState.OPEN;
      });

      source.addEventListener('error', e => {
        // Error event doesn't contain additional info.
        ErrorLogger.warning(
          e instanceof ErrorEvent ? e.error : new Error('SseStore: error event'),
        );

        closeSse();

        let timeout = Math.min(5 * 60 * 1000, 1000 * (2 ** ref.current.numReconnects));
        // This is needed because WS can disconnect right after connecting.
        if (performance.now() - ref.current.lastReconnectTime > timeout) {
          ref.current.numReconnects = 0;
          timeout = 1000;
        }

        ref.current.reconnectTimer = window.setTimeout(
          createEventSource,
          timeout,
        );
        ref.current.numReconnects++;
        ref.current.lastReconnectTime = performance.now();
      });
    }, [closeSse, handleApiEntities]);

    // todo: low/mid fetch sse otp using useApi
    const { fetchApi: fetchOtp } = useDeferredApi('sseOtp', {}, {
      type: 'load',
      method: 'post',
      noReturnState: true,
      onFetch(data) {
        createEventSource(data.otp);
      },
      showToastOnError: false,
    });

    // If connection exists and isn't close, do nothing.
    const startSse = useCallback(() => {
      if (ref.current.readyState === ReadyState.CLOSED) {
        // OTP is needed for auth, not for connecting to SSE.
        if (authToken) {
          ref.current.readyState = ReadyState.CONNECTING;
          void fetchOtp();
        } else {
          createEventSource(null);
        }
      }
    }, [authToken, fetchOtp, createEventSource]);

    const addSubscription = useCallback((name: string, params: Memoed<Pojo>) => {
      const event = serializeEvent(name, params);
      const hasSubbed = ref.current.subscriptions.has(event);
      ref.current.subscriptions.add(event);

      if (ref.current.readyState === ReadyState.CLOSED
        || !ref.current.sessionId) {
        startSse();
      } else if (ref.current.readyState === ReadyState.OPEN
        && !hasSubbed) {
        void sseSubscribe({
          sessionId: ref.current.sessionId,
          events: [{ name, params }],
        });
      }
    }, [startSse, sseSubscribe]);

    const removeSubscription = useCallback((name: string, params: Memoed<Pojo>) => {
      const event = serializeEvent(name, params);
      const hasSubbed = ref.current.subscriptions.has(event);
      ref.current.subscriptions.delete(serializeEvent(name, params));

      if (ref.current.readyState !== ReadyState.CLOSED
        && !ref.current.subscriptions.size) {
        closeSse();
      } else if (ref.current.readyState === ReadyState.OPEN
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

export { SseProvider, useSseStore };

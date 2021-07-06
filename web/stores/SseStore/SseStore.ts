import SseEventEmitter from 'lib/singletons/SseEventEmitter';
import serializeEvent, { unserializeEvent } from 'lib/serializeEvent';
import { HOME_URL } from 'settings';
import useRepliesSse from './useRepliesSse';

const [
  SseProvider,
  useSseStore,
] = constate(
  function SseStore() {
    const [state, setState] = useState({
      sessionId: null as string | null,
    });
    const ref = useRef({
      source: null as EventSource | null,
      ee: SseEventEmitter,
      initializedEe: false,
      subscriptions: new Set<string>(),
      sessionId: null as string | null,
      otp: null as Nullish<string>,
      isEventSourceOpen: false,
    });
    ref.current.sessionId = state.sessionId;
    const authToken = useAuthToken();

    if (!ref.current.initializedEe) {
      ref.current.initializedEe = true;
      // todo: low/mid types for sse
      ref.current.ee.on('sseConnected', (_, { meta: { sessionId } }) => {
        setState(s => ({ ...s, sessionId }));
      });
    }

    const { fetchApi: sseSubscribe } = useDeferredApi(
      'sseSubscribe',
      {},
      {
        type: 'load',
        method: 'post',
        noReturnState: true,
      },
    );

    const { fetchApi: sseUnsubscribe } = useDeferredApi(
      'sseSubscribe',
      {},
      {
        type: 'load',
        method: 'post',
        noReturnState: true,
      },
    );

    const updateEventSource = useCallback(() => {
      ref.current.source?.close();
      const source = new EventSource(
        `${HOME_URL}/sse?params=${encodeURIComponent(JSON.stringify({
          otp: ref.current.otp,
          events: [...ref.current.subscriptions].map(sub => unserializeEvent(sub)),
        }))}`,
        {
          withCredentials: true,
        },
      );
      ref.current.source = source;

      source.addEventListener('message', msg => {
        let data;
        try {
          data = JSON.parse(msg.data);
        } catch {
          ErrorLogger.warning(new Error('Can\'t parse SSE data'), msg.data.slice(0, 200));
          return;
        }

        if (!data.type || !data.entities) {
          ErrorLogger.warning(new Error('Invalid SSE data'), data.slice(0, 200));
          return;
        }

        const { name, params } = unserializeEvent(data.type);
        ref.current.ee.emit(name, params, data);
      });

      source.addEventListener('open', () => {
        ref.current.isEventSourceOpen = true;
      });

      source.addEventListener('error', e => {
        ErrorLogger.warning((e as ErrorEvent).error, 'SseStore: error event');
        ref.current.isEventSourceOpen = false;

        updateEventSource();
      });
    }, []);

    const addSubscription = useCallback((name: string, params: Memoed<Pojo>) => {
      const event = serializeEvent(name, params);
      const hadEvent = ref.current.subscriptions.has(event);
      ref.current.subscriptions.add(event);

      if (ref.current.source) {
        if (!ref.current.isEventSourceOpen) {
          updateEventSource();
        } else if (ref.current.sessionId && !hadEvent) {
          void sseSubscribe({
            sessionId: ref.current.sessionId,
            events: [{ name, params }],
          });
        }
      }
    }, [sseSubscribe, updateEventSource]);

    const removeSubscription = useCallback((name: string, params: Memoed<Pojo>) => {
      const event = serializeEvent(name, params);
      const hadEvent = ref.current.subscriptions.has(event);
      ref.current.subscriptions.delete(serializeEvent(name, params));

      if (ref.current.source) {
        if (!ref.current.isEventSourceOpen) {
          updateEventSource();
        } else if (ref.current.sessionId && hadEvent) {
          void sseUnsubscribe({
            sessionId: ref.current.sessionId,
            events: [{ name, params }],
          });
        }
      }
    }, [sseUnsubscribe, updateEventSource]);

    const startSse = useCallback((otp: Nullish<string>) => {
      ref.current.otp = otp;
      updateEventSource();
    }, [updateEventSource]);

    // todo: low/mid fetch sse otp using useApi
    const { fetchApi: fetchOtp } = useDeferredApi('sseOtp', {}, {
      type: 'load',
      method: 'post',
      noReturnState: true,
      onFetch: useCallback(data => {
        startSse(data.otp);
      }, [startSse]),
      onError: NOOP,
    });

    const initSse = useCallback(async () => {
      if (ref.current.source === null) {
        if (authToken) {
          void fetchOtp();
        } else {
          startSse(null);
        }
      }
    }, [authToken, fetchOtp, startSse]);

    useRepliesSse(ref.current.ee);

    return useDeepMemoObj({
      sseEmitter: ref.current.ee,
      sessionId: state.sessionId,
      addSubscription,
      removeSubscription,
      initSse,
    });
  },
);

export { SseProvider, useSseStore };

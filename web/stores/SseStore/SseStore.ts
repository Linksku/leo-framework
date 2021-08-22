import useFirstMountState from 'react-use/lib/useFirstMountState';

import SseEventEmitter from 'lib/singletons/SseEventEmitter';
import serializeEvent, { unserializeEvent } from 'lib/serializeEvent';
import { HOME_URL } from 'settings';
import useRepliesSse from './useRepliesSse';

const [
  SseProvider,
  useSseStore,
] = constate(
  function SseStore() {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const ref = useRef({
      source: null as EventSource | null,
      subscriptions: new Set<string>(),
      otp: null as Nullish<string>,
      isEventSourceOpen: false,
    });
    const authToken = useAuthToken();

    if (useFirstMountState()) {
      // todo: low/mid types for sse
      SseEventEmitter.on('sseConnected', (_: any, data: { meta: { sessionId: string } }) => {
        setSessionId(data.meta.sessionId);
      });
    }

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
        batchedUpdates(() => {
          SseEventEmitter.emit(name, params, data);
        });
      });

      source.addEventListener('open', () => {
        ref.current.isEventSourceOpen = true;
      });

      source.addEventListener('error', (e: Event | ErrorEvent) => {
        ErrorLogger.warning(
          e instanceof ErrorEvent ? e.error : new Error('SseStore: error event'),
        );
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
        } else if (sessionId && !hadEvent) {
          void sseSubscribe({
            sessionId,
            events: [{ name, params }],
          });
        }
      }
    }, [sseSubscribe, updateEventSource, sessionId]);

    const removeSubscription = useCallback((name: string, params: Memoed<Pojo>) => {
      const event = serializeEvent(name, params);
      const hadEvent = ref.current.subscriptions.has(event);
      ref.current.subscriptions.delete(serializeEvent(name, params));

      if (ref.current.source) {
        if (!ref.current.isEventSourceOpen) {
          updateEventSource();
        } else if (sessionId && hadEvent) {
          void sseUnsubscribe({
            sessionId,
            events: [{ name, params }],
          });
        }
      }
    }, [sseUnsubscribe, updateEventSource, sessionId]);

    const startSse = useCallback((otp: Nullish<string>) => {
      ref.current.otp = otp;
      updateEventSource();
    }, [updateEventSource]);

    // todo: low/mid fetch sse otp using useApi
    const { fetchApi: fetchOtp } = useDeferredApi('sseOtp', {}, {
      type: 'load',
      method: 'post',
      noReturnState: true,
      onFetch(data) {
        startSse(data.otp);
      },
      showToastOnError: false,
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

    // todo: low/mid inject these sse hooks
    useRepliesSse();

    return useDeepMemoObj({
      sessionId,
      addSubscription,
      removeSubscription,
      initSse,
    });
  },
);

export { SseProvider, useSseStore };

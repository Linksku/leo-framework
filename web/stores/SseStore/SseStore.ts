import qs from 'query-string';

import SseEventEmitter from 'lib/singletons/SseEventEmitter';
import { unserializeEvent } from 'lib/serializeEvent';
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
    });
    const authToken = useAuthToken();

    if (!ref.current.initializedEe) {
      ref.current.initializedEe = true;
      // todo: low/mid types for sse
      ref.current.ee.on('sseConnected', (_, { meta: { sessionId } }) => {
        setState(s => ({ ...s, sessionId }));
      });
    }

    const startSse = useCallback((otp: Nullish<string>) => {
      ref.current.source = new EventSource(
        `${HOME_URL}/sse?${qs.stringify({
          otp,
        })}`,
        { withCredentials: true },
      );

      ref.current.source.addEventListener('message', msg => {
        let data;
        try {
          data = JSON.parse(msg.data);
        } catch {
          console.error('Invalid SSE data:', msg);
          return;
        }

        if (!data.type || !data.entities) {
          console.error('Invalid SSE data:', msg);
          return;
        }

        const { name, params } = unserializeEvent(data.type);
        ref.current.ee.emit(name, params, data);
      });
    }, []);

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

    // todo: high/hard handle reconnect
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
      initSse,
    });
  },
);

export { SseProvider, useSseStore };

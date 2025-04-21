import type { SseName, SseParams, SseData } from 'config/sse';
import useDeepMemoObj from 'utils/useDeepMemoObj';
import useEnterRoute from 'core/router/useEnterRoute';

function useSse<Name extends SseName>(
  eventName: Name,
  eventParams: SseParams[Name] | null,
  cb: Stable<(data: SseData[Name]) => void>,
): void;

function useSse<Name extends SseName>(
  eventName: Name,
  eventParams: SseParams[Name] | null,
): void;

function useSse<Name extends SseName>(
  eventName: Name,
  eventParams: SseParams[Name] | null,
  cb?: Stable<(data: SseData[Name]) => void>,
): void {
  const { addSubscription, removeSubscription } = useSseStore();
  const paramsMemo = useDeepMemoObj(eventParams) as Stable<SseParams[Name]>;

  const isEnabled = !!eventParams;
  useEnterRoute(useCallback(() => {
    if (!isEnabled) {
      return NOOP;
    }

    // todo: high/mid addSubscription doesn't run when params change
    addSubscription(eventName, paramsMemo, cb);

    return () => {
      removeSubscription(eventName, paramsMemo, cb);
    };
  }, [isEnabled, eventName, paramsMemo, addSubscription, removeSubscription, cb]));
}

export default useSse;

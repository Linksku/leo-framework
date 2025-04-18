import type { SseName, SseParams, SseData } from 'config/sse';
import useDeepMemoObj from 'utils/useDeepMemoObj';
import useEnterRoute from 'core/router/useEnterRoute';

export default function useSse<Name extends SseName>(
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

    addSubscription(eventName, paramsMemo, cb);

    return () => {
      removeSubscription(eventName, paramsMemo, cb);
    };
  }, [isEnabled, eventName, paramsMemo, addSubscription, removeSubscription, cb]));
}

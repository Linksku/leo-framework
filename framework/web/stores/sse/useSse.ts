import useDeepMemoObj from 'utils/useDeepMemoObj';
import useEnterRoute from 'core/router/useEnterRoute';

export default function useSse(
  eventName: string,
  eventParams: JsonObj = {},
  {
    isEnabled = true,
  } = {},
): void {
  const { addSubscription, removeSubscription } = useSseStore();
  const paramsMemo = useDeepMemoObj(eventParams);

  useEnterRoute(useCallback(() => {
    if (!isEnabled) {
      return NOOP;
    }

    addSubscription(eventName, paramsMemo);

    return () => {
      removeSubscription(eventName, paramsMemo);
    };
  }, [isEnabled, eventName, paramsMemo, addSubscription, removeSubscription]));
}

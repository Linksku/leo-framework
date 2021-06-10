import useEffectIfReady from 'lib/hooks/useEffectIfReady';
import useDeepMemoObj from 'lib/hooks/useDeepMemoObj';

export default function useSse(
  eventName: string,
  eventParams: Pojo = {},
  {
    isReady = true,
  } = {},
) {
  const { sessionId, initSse, addSubscription, removeSubscription } = useSseStore();
  const paramsMemo = useDeepMemoObj(eventParams);

  // todo: low/mid multiple components using same event.
  useEffectIfReady(() => {
    void addSubscription(eventName, paramsMemo);

    return () => {
      void removeSubscription(eventName, paramsMemo);
    };
  }, [addSubscription, removeSubscription], isReady && !!sessionId);

  useEffectIfReady(initSse, [], isReady);
}

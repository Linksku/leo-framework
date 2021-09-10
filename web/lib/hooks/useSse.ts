import useEffectIfReady from 'lib/hooks/useEffectIfReady';
import useDeepMemoObj from 'lib/hooks/useDeepMemoObj';

export default function useSse(
  eventName: string,
  eventParams: Pojo = {},
  {
    isReady = true,
  } = {},
) {
  const { addSubscription, removeSubscription } = useSseStore();
  const paramsMemo = useDeepMemoObj(eventParams);

  // todo: low/mid multiple components using same event.
  useEffectIfReady(() => {
    addSubscription(eventName, paramsMemo);

    return () => {
      removeSubscription(eventName, paramsMemo);
    };
  }, [addSubscription, removeSubscription], isReady);
}

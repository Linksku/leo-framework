import useEffectIfReady from 'utils/hooks/useEffectIfReady';
import useDeepMemoObj from 'utils/hooks/useDeepMemoObj';

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

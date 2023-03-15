import useEffectIfReady from 'utils/hooks/useEffectIfReady';
import useDeepMemoObj from 'utils/hooks/useDeepMemoObj';

export default function useSse(
  eventName: string,
  eventParams: JsonObj = {},
  {
    isReady = true,
  } = {},
) {
  const { addSubscription, removeSubscription } = useSseStore();
  const paramsMemo = useDeepMemoObj(eventParams);

  useEffectIfReady(() => {
    addSubscription(eventName, paramsMemo);

    return () => {
      removeSubscription(eventName, paramsMemo);
    };
  }, [addSubscription, removeSubscription, eventName, paramsMemo], isReady);
}

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

  // todo: low/mid don't remove subscription if another component needs it
  useEffectIfReady(() => {
    addSubscription(eventName, paramsMemo);

    return () => {
      removeSubscription(eventName, paramsMemo);
    };
  }, [addSubscription, removeSubscription], isReady);
}

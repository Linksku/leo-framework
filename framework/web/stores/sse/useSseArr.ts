import useEffectIfReady from 'utils/useEffectIfReady';
import useDeepMemoObj from 'utils/useDeepMemoObj';

export default function useSseArr(
  events: {
    name: string,
    params: JsonObj,
  }[],
  {
    isReady = true,
  } = {},
): void {
  const { addSubscription, removeSubscription } = useSseStore();
  const eventsMemo = useDeepMemoObj(events);

  useEffectIfReady(() => {
    for (const event of eventsMemo) {
      addSubscription(event.name, event.params);
    }

    return () => {
      for (const event of eventsMemo) {
        removeSubscription(event.name, event.params);
      }
    };
  }, [addSubscription, removeSubscription, eventsMemo], isReady);
}

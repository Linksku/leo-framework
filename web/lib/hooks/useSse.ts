import useEffectIfReady from 'lib/hooks/useEffectIfReady';
import useDeepMemoObj from 'lib/hooks/useDeepMemoObj';

export default function useSse(
  eventName: string,
  eventParams: Pojo = {},
  {
    isReady = true,
  } = {},
) {
  const { sessionId, initSse } = useSseStore();
  const paramsMemo = useDeepMemoObj(eventParams);

  const { fetchApi: sseSubscribe } = useDeferredApi(
    'sseSubscribe',
    { eventName, eventParams: paramsMemo },
    {
      type: 'load',
      method: 'post',
      noReturnState: true,
    },
  );

  const { fetchApi: sseUnsubscribe } = useDeferredApi(
    'sseSubscribe',
    { eventName, eventParams: paramsMemo },
    {
      type: 'load',
      method: 'post',
      noReturnState: true,
    },
  );

  // todo: low/mid multiple components using same event.
  useEffectIfReady(() => {
    void sseSubscribe({ sessionId: sessionId as string });

    return () => {
      void sseUnsubscribe({ sessionId: sessionId as string });
    };
  }, [sseSubscribe, sseUnsubscribe], isReady && !!sessionId);

  useEffectIfReady(initSse, [], isReady);
}

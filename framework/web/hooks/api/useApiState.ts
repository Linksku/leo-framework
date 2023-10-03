import type { UseApiState } from 'stores/ApiStore';
import useUpdate from 'hooks/useUpdate';
import { useHadRouteBeenActive, useIsRouteVisible } from 'stores/RouteStore';
import type { ApiReturn } from './useApi';

export default function useApiState<Name extends ApiName>(
  name: Name,
  params: Stable<ApiParams<Name>>,
  {
    initialCursor,
    refetchKey,
  }: {
    initialCursor?: string,
    refetchKey?: string,
  } = {},
): ApiReturn<Name> {
  let isRouteVisible = true;
  let hadBeenActive = true;
  try {
    // Doesn't rerender if isRouteVisible updates
    // eslint-disable-next-line react-hooks/rules-of-hooks
    isRouteVisible = useIsRouteVisible();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    hadBeenActive = useHadRouteBeenActive();
  } catch {}
  const shouldFetch = hadBeenActive && isRouteVisible;

  const { getApiState, subscribeApiState } = useApiStore();
  const update = useUpdate();
  const stateRef = useRef<UseApiState<Name>>(
    useMemo(
      () => {
        const apiState = getApiState({
          name,
          params,
          initialCursor,
          refetchKey,
          shouldFetch,
        });
        if (!hadBeenActive) {
          return { ...apiState, fetching: true };
        }
        return apiState;
      },
      [
        getApiState,
        name,
        params,
        initialCursor,
        refetchKey,
        shouldFetch,
        hadBeenActive,
      ],
    ),
  );

  useEffect(() => {
    if (!shouldFetch) {
      return undefined;
    }

    const unsub = subscribeApiState({
      name,
      params,
      initialCursor,
      state: stateRef.current,
      update,
    });
    return unsub;
  }, [
    subscribeApiState,
    name,
    params,
    update,
    initialCursor,
    shouldFetch,
  ]);

  return {
    data: stateRef.current.data as ApiData<Name>,
    fetching: stateRef.current.fetching,
    isFirstFetch: stateRef.current.isFirstTime && stateRef.current.fetching,
    error: stateRef.current.error,
    addedEntityIds: stateRef.current.addedEntityIds,
    deletedEntityIds: stateRef.current.deletedEntityIds,
  };
}

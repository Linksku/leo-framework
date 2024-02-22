import type { UseApiState } from 'stores/ApiStore';
import useUpdate from 'hooks/useUpdate';
import useRefInitialState from 'hooks/useRefInitialState';
import { useHadRouteBeenActive, useIsRouteVisible } from 'stores/RouteStore';
import type { ApiReturn } from './useApi';

export default function useApiState<Name extends ApiName>(
  name: Name,
  params: Stable<ApiParams<Name>>,
  {
    initialCursor,
    cacheBreaker,
  }: {
    initialCursor?: string,
    cacheBreaker?: string,
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
  const stateRef = useRefInitialState<UseApiState<Name>>(() => {
    const apiState = getApiState({
      name,
      params,
      initialCursor,
      cacheBreaker,
      shouldFetch,
    });
    if (!hadBeenActive) {
      return { ...apiState, fetching: true };
    }
    return apiState;
  });

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
    stateRef,
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

import { type UseApiState, apiNeedsFetch, getApi } from 'stores/api/ApiStore';
import useUpdate from 'utils/useUpdate';
import useRefInitialState from 'utils/useRefInitialState';
import useEffectInitialMount from 'utils/useEffectInitialMount';
import useAccumulatedVal from 'utils/useAccumulatedVal';
import usePrevious from 'utils/usePrevious';
import type { ApiReturn } from './useApi';

export default function useApiState<
  Name extends ApiName,
  Params extends Stable<ApiParams<Name>>,
  ExpectedParams = Name extends any ? ApiParams<Name> : never,
>(
  name: Name,
  params: Name extends any ? Params & NoExtraProps<ExpectedParams, Params> : never,
  {
    shouldFetch = true,
    initialCursor,
    key,
    cacheBreaker,
  }: {
    shouldFetch?: boolean,
    initialCursor?: string,
    key?: string,
    cacheBreaker?: string,
  } = {},
): ApiReturn<Name> {
  const routeState = useRouteStore(true);
  const isRouteVisible = routeState?.isRouteVisible ?? true;
  const hadRouteBeenActive = routeState?.hadRouteBeenActive ?? true;
  const routeKey = routeState?.key;
  shouldFetch &&= hadRouteBeenActive && isRouteVisible;

  const { getApiState, subscribeApiState } = useApiStore();
  const update = useUpdate();
  const stateRef = useRefInitialState<UseApiState<Name>>(() => {
    const apiState = getApiState({
      name,
      params,
      initialCursor,
      cacheBreaker,
    });
    const api = getApi(name, params ?? EMPTY_OBJ, initialCursor);
    if (shouldFetch && (!api || apiNeedsFetch(api, key, cacheBreaker))) {
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
      routeKey,
    });
    return unsub;
  }, [
    shouldFetch,
    subscribeApiState,
    name,
    params,
    initialCursor,
    stateRef,
    update,
    routeKey,
  ]);

  // Initial fetching state, before useApi is called
  const prevFetching = usePrevious(stateRef.current.fetching);
  const didFetchingChange = useAccumulatedVal(
    false,
    s => s || (prevFetching !== undefined && prevFetching !== stateRef.current.fetching),
  );
  const [fetchingOverride, setFetchingOverride] = useState(() => {
    const api = getApi(name, params, initialCursor);
    return stateRef.current.fetching
      || (shouldFetch && (!api || apiNeedsFetch(api, key, cacheBreaker)));
  });
  useEffectInitialMount(() => {
    // Runs after setting state.fetching in ApiStore
    setTimeout(() => {
      if (fetchingOverride !== stateRef.current.fetching) {
        if (!process.env.PRODUCTION) {
          ErrorLogger.warn(new Error(`useApi(${name}): fetchingOverride !== ${stateRef.current.fetching}`));
        }

        setFetchingOverride(stateRef.current.fetching);
      }
    });
  });

  return {
    data: stateRef.current.data as ApiData<Name>,
    fetching: didFetchingChange
      ? stateRef.current.fetching
      : fetchingOverride,
    isFirstFetch: stateRef.current.isFirstTime
      && (stateRef.current.fetching || !hadRouteBeenActive),
    error: stateRef.current.error,
    addedEntityIds: stateRef.current.addedEntityIds,
    deletedEntityIds: stateRef.current.deletedEntityIds,
  };
}

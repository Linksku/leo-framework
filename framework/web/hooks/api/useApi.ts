import equal from 'fast-deep-equal';

import type { UseApiState, ShouldAddCreatedEntity, ApiOpts } from 'stores/ApiStore';
import type ApiError from 'core/ApiError';
import useLatestCallback from 'hooks/useLatestCallback';
import useUpdate from 'hooks/useUpdate';
import useRefInitialState from 'hooks/useRefInitialState';
import { useHadRouteBeenActive, useIsRouteVisible } from 'stores/RouteStore';
import { API_TIMEOUT } from 'consts/server';

export type UseApiOpts<Name extends ApiName> = {
  shouldFetch?: boolean,
  returnState?: boolean,
  onFetch?: (results: ApiData<Name>) => void,
  onError?: (err: ApiError) => void,
  isPaginated?: boolean,
  initialCursor?: string,
  shouldAddCreatedEntity?: ShouldAddCreatedEntity<EntityType>,
  shouldRemoveDeletedEntity?: boolean,
  paginationEntityType?: EntityType,
  addEntitiesToEnd?: boolean,
  refetchOnMount?: boolean,
} & Partial<ApiOpts>;

export type ApiReturn<Name extends ApiName> = {
  data: ApiData<Name> | null,
  fetching: boolean,
  isFirstFetch: boolean,
  error: ApiError | null,
  addedEntityIds: Stable<EntityId[]>,
  deletedEntityIds: Stable<Set<EntityId>>,
};

function useApi<Name extends ApiName, Params, Opt extends UseApiOpts<Name>>(
  name: Name,
  params: Params & Stable<NoExtraProps<ApiParams<Name>, Params>>,
  opts: Opt,
): Opt['returnState'] extends true ? ApiReturn<Name> : null;

function useApi<Name extends ApiName, Params>(
  name: Name,
  params: Params & Stable<NoExtraProps<ApiParams<Name>, Params>>,
  opts?: UseApiOpts<Name> & { returnState?: false },
): null;

// Note: probably can't use suspense with batching
function useApi<Name extends ApiName>(
  name: Name,
  params: Stable<ApiParams<Name>>,
  {
    shouldFetch = true,
    returnState = false,
    onFetch,
    onError,
    isPaginated,
    initialCursor,
    shouldAddCreatedEntity,
    shouldRemoveDeletedEntity,
    paginationEntityType,
    addEntitiesToEnd,
    cacheBreaker,
    refetchOnFocus,
    refetchOnMount,
    refetchIfStale,
    showToastOnError,
    batchInterval,
  }: UseApiOpts<Name> = {},
): ApiReturn<Name> | null {
  useDebugValue(name);

  let isRouteVisible = true;
  let hadBeenActive = true;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    isRouteVisible = useIsRouteVisible();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    hadBeenActive = useHadRouteBeenActive();
  } catch {}
  // todo: mid/mid don't fetch if inactive route fetches new api
  if (!hadBeenActive || !isRouteVisible) {
    shouldFetch = false;
  }

  const {
    getApiState,
    subscribeApiHandlers,
    clearCache,
  } = useApiStore();
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
  const ref = useRef({
    firstEffectTime: null as number | null,
    firstEffectParams: null as any,
    isFirstTime: true,
  });

  if (!process.env.PRODUCTION
    && stateRef.current.data
    && !ref.current.isFirstTime
    && !shouldFetch
    && isRouteVisible
    && hadBeenActive) {
    ErrorLogger.warn(new Error(`useApi(${name}): shouldFetch became false after fetched`));
  }

  const update = useUpdate();
  const onFetchWrap = useLatestCallback((results: ApiData<Name>) => {
    ref.current.isFirstTime = false;
    onFetch?.(results);
  });
  const onErrorWrap = useLatestCallback((err: ApiError) => {
    ref.current.isFirstTime = false;
    onError?.(err);
  });

  useEffect(() => {
    if (!shouldFetch) {
      return undefined;
    }

    if (ref.current.firstEffectTime === null) {
      ref.current.firstEffectTime = performance.now();
      ref.current.firstEffectParams = params;
      if (refetchOnMount) {
        clearCache(name, params);
      }
    } else if (!process.env.PRODUCTION
      && performance.now() - ref.current.firstEffectTime < API_TIMEOUT
      && !equal(ref.current.firstEffectParams, params)) {
      ErrorLogger.warn(new Error(`useApi(${name}): params changed on load`));
    }

    const unsub = subscribeApiHandlers({
      name,
      params,
      cacheBreaker,
      state: stateRef.current,
      update: returnState ? update : NOOP,
      onFetch: onFetchWrap,
      onError: onErrorWrap,
      isPaginated,
      initialCursor,
      shouldAddCreatedEntity,
      shouldRemoveDeletedEntity,
      paginationEntityType,
      addEntitiesToEnd,
      refetchOnFocus,
      refetchIfStale,
      showToastOnError,
      batchInterval,
    });
    return unsub;
  }, [
    stateRef,
    clearCache,
    refetchOnMount,
    subscribeApiHandlers,
    name,
    params,
    cacheBreaker,
    update,
    returnState,
    onFetchWrap,
    onErrorWrap,
    isPaginated,
    initialCursor,
    shouldAddCreatedEntity,
    shouldRemoveDeletedEntity,
    paginationEntityType,
    addEntitiesToEnd,
    shouldFetch,
    refetchOnFocus,
    refetchIfStale,
    showToastOnError,
    batchInterval,
  ]);

  if (!returnState) {
    return null;
  }
  return {
    data: stateRef.current.data as ApiData<Name>,
    fetching: stateRef.current.fetching,
    isFirstFetch: stateRef.current.isFirstTime && stateRef.current.fetching,
    error: stateRef.current.error,
    addedEntityIds: stateRef.current.addedEntityIds,
    deletedEntityIds: stateRef.current.deletedEntityIds,
  };
}

export default useApi;

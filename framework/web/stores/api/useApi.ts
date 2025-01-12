import equal from 'fast-deep-equal';

import type { UseApiState, ShouldAddCreatedEntity, ApiOpts } from 'stores/api/ApiStore';
import type ApiError from 'core/ApiError';
import { getApiId, getApi, apiNeedsFetch } from 'stores/api/ApiStore';
import useLatestCallback from 'utils/useLatestCallback';
import useUpdate from 'utils/useUpdate';
import useRefInitialState from 'utils/useRefInitialState';
import { API_TIMEOUT } from 'consts/server';
import useEnterRoute from 'core/router/useEnterRoute';

export type UseApiOpts<Name extends ApiName> = {
  shouldFetch?: boolean,
  returnState?: boolean,
  onFetch?: (results: ApiData<Name>) => void,
  runOnFetchOnce?: boolean,
  onError?: (err: ApiError) => void,
  isPaginated?: boolean,
  initialCursor?: string,
  shouldAddCreatedEntity?: ShouldAddCreatedEntity<EntityType>,
  shouldRemoveDeletedEntity?: boolean,
  paginationEntityType?: EntityType,
  addEntitiesToEnd?: boolean,
  refetchOnMount?: boolean,
  key?: string,
} & Partial<ApiOpts>;

export type ApiReturn<Name extends ApiName> = {
  data: ApiData<Name> | null,
  fetching: boolean,
  isFirstFetch: boolean,
  error: ApiError | null,
  addedEntityIds: Stable<EntityId[]>,
  deletedEntityIds: Stable<Set<EntityId>>,
};

function useApi<
  Name extends ApiName,
  Params extends Stable<ApiParams<Name>>,
  Opt extends UseApiOpts<Name>,
  ExpectedParams = Name extends any ? ApiParams<Name> : never,
>(
  name: Name,
  params: (Params & NoExtraProps<ExpectedParams, Params>)
    | null,
  opts: Opt,
): Opt['returnState'] extends true ? ApiReturn<Name> : null;

function useApi<
  Name extends ApiName,
  Params extends Stable<ApiParams<Name>>,
  ExpectedParams = Name extends any ? ApiParams<Name> : never,
>(
  name: Name,
  params: (Params & NoExtraProps<ExpectedParams, Params>)
    | null,
  opts?: UseApiOpts<Name> & { returnState?: false },
): null;

// Note: probably can't use suspense with batching
function useApi<
  Name extends ApiName,
  Params extends Stable<ApiParams<Name>>,
  ExpectedParams = Name extends any ? ApiParams<Name> : never,
>(
  name: Name,
  params: (Params & NoExtraProps<ExpectedParams, Params>)
    | null,
  {
    shouldFetch = true,
    returnState = false,
    onFetch,
    runOnFetchOnce,
    onError,
    isPaginated,
    initialCursor,
    shouldAddCreatedEntity,
    shouldRemoveDeletedEntity,
    paginationEntityType,
    addEntitiesToEnd,
    key,
    cacheBreaker,
    refetchOnFocus,
    refetchOnConnect,
    // On mount or enter route
    refetchOnMount,
    refetchIfStale,
    // todo: low/mid don't show toast again when refetching stale api
    showToastOnError,
    batchInterval,
    // todo: low/mid fetch api on render instead of in effect
    // "immediate" is no longer needed with queueMicrotask
    immediate,
  }: UseApiOpts<Name> = {},
): ApiReturn<Name> | null {
  useDebugValue(name);

  const routeState = useRouteStore(true);
  const isRouteVisible = routeState?.isRouteVisible ?? true;
  const hadRouteBeenActive = routeState?.hadRouteBeenActive ?? true;
  const routeKey = routeState?.key;
  // todo: low/mid don't fetch if inactive route fetches new api
  if (!hadRouteBeenActive || !isRouteVisible) {
    // Doesn't seem to work with Freeze
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
      params: params ?? EMPTY_OBJ as Stable<ApiParams<Name>>,
      initialCursor,
      key,
      cacheBreaker,
    });
    const api = getApi(name, params ?? EMPTY_OBJ, initialCursor);
    if (shouldFetch && (!api || apiNeedsFetch(api, key, cacheBreaker))) {
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
    && !shouldFetch
    && stateRef.current.data
    && params
    && stateRef.current.lastFetchedId === getApiId(name, params, initialCursor)
    && isRouteVisible
    && hadRouteBeenActive) {
    ErrorLogger.warn(new Error(`useApi(${name}): shouldFetch became false after fetched`));
  }

  const update = useUpdate();
  const onFetchWrap = useLatestCallback((results: ApiData<Name>) => {
    if (ref.current.isFirstTime || !runOnFetchOnce) {
      onFetch?.(results);
    }
    ref.current.isFirstTime = false;
  });
  const onErrorWrap = useLatestCallback((err: ApiError) => {
    onError?.(err);
    ref.current.isFirstTime = false;
  });
  const shouldAddCreatedEntityWrap = useLatestCallback((ent: Entity) => {
    if (typeof shouldAddCreatedEntity === 'function') {
      return shouldAddCreatedEntity(ent);
    }
    return false;
  });
  const subscribe = useLatestCallback(() => subscribeApiHandlers({
    name,
    params: TS.notNullish(params),
    key,
    cacheBreaker,
    state: stateRef.current,
    update: returnState ? update : NOOP,
    onFetch: onFetchWrap,
    onError: onErrorWrap,
    isPaginated,
    initialCursor,
    shouldAddCreatedEntity: typeof shouldAddCreatedEntity === 'function'
      ? shouldAddCreatedEntityWrap
      : shouldAddCreatedEntity,
    shouldRemoveDeletedEntity,
    paginationEntityType,
    addEntitiesToEnd,
    routeKey,
    refetchOnFocus,
    refetchOnConnect,
    refetchIfStale,
    showToastOnError,
    batchInterval,
    immediate,
  }));

  useEnterRoute(useCallback(() => {
    if (shouldFetch && params && refetchOnMount && ref.current.firstEffectTime !== null) {
      clearCache(name, params);
      return subscribe();
    }

    return NOOP;
  }, [shouldFetch, params, refetchOnMount, clearCache, name, subscribe]));

  useEffect(() => {
    if (!shouldFetch || !params) {
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

    return subscribe();
  }, [
    name,
    params,
    key,
    cacheBreaker,
    shouldFetch,
    refetchOnMount,
    clearCache,
    subscribe,
  ]);

  if (!returnState) {
    return null;
  }
  return {
    data: stateRef.current.data as ApiData<Name>,
    fetching: stateRef.current.fetching,
    isFirstFetch: stateRef.current.isFirstTime
      && (stateRef.current.fetching || !hadRouteBeenActive),
    error: stateRef.current.error,
    addedEntityIds: stateRef.current.addedEntityIds,
    deletedEntityIds: stateRef.current.deletedEntityIds,
  };
}

export default useApi;

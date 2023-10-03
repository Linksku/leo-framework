import type { UseApiState, ShouldAddCreatedEntity } from 'stores/ApiStore';
import useDynamicCallback from 'hooks/useDynamicCallback';
import useUpdate from 'hooks/useUpdate';
import { useHadRouteBeenActive, useIsRouteVisible } from 'stores/RouteStore';

export type ApiOpts<Name extends ApiName> = {
  shouldFetch?: boolean,
  returnState?: boolean,
  onFetch?: (results: ApiData<Name>) => void,
  onError?: (err: Error) => void,
  isPaginated?: boolean,
  initialCursor?: string,
  shouldAddCreatedEntity?: ShouldAddCreatedEntity<EntityType>,
  shouldRemoveDeletedEntity?: boolean,
  paginationEntityType?: EntityType,
  addEntitiesToEnd?: boolean,
  refetchKey?: string,
  refetchOnFocus?: boolean,
  refetchOnMount?: boolean,
  refetchIfStale?: boolean,
  showToastOnError?: boolean,
};

export type ApiReturn<Name extends ApiName> = {
  data: ApiData<Name> | null,
  fetching: boolean,
  isFirstFetch: boolean,
  error: Error | null,
  addedEntityIds: Stable<EntityId[]>,
  deletedEntityIds: Stable<Set<EntityId>>,
};

function useApi<Name extends ApiName, Params, Opt extends ApiOpts<Name>>(
  name: Name,
  params: Params & Stable<NoExtraProps<ApiParams<Name>, Params>>,
  opts: Opt,
): Opt['returnState'] extends true ? ApiReturn<Name> : null;

function useApi<Name extends ApiName, Params>(
  name: Name,
  params: Params & Stable<NoExtraProps<ApiParams<Name>, Params>>,
  opts?: ApiOpts<Name> & { returnState?: false },
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
    refetchKey,
    refetchOnFocus,
    refetchOnMount,
    refetchIfStale,
    showToastOnError,
  }: ApiOpts<Name> = {},
): ApiReturn<Name> | null {
  useDebugValue(name);

  let isRouteVisible = true;
  let hadBeenActive = true;
  try {
    // Doesn't rerender if isRouteVisible updates
    // eslint-disable-next-line react-hooks/rules-of-hooks
    isRouteVisible = useIsRouteVisible();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    hadBeenActive = useHadRouteBeenActive();
  } catch {}
  if (!hadBeenActive || !isRouteVisible) {
    shouldFetch = false;
  }

  const {
    getApiState,
    subscribeApiHandlers,
    clearCache,
  } = useApiStore();
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
  const ref = useRef({
    ranFirstEffect: false,
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
  const onFetchWrap = useDynamicCallback((results: ApiData<Name>) => {
    ref.current.isFirstTime = false;
    onFetch?.(results);
  });
  const onErrorWrap = useDynamicCallback((err: Error) => {
    ref.current.isFirstTime = false;
    onError?.(err);
  });

  useEffect(() => {
    if (!shouldFetch) {
      return undefined;
    }

    if (!ref.current.ranFirstEffect) {
      ref.current.ranFirstEffect = true;
      if (refetchOnMount) {
        clearCache(name, params);
      }
    }

    // todo: low/mid fetch before render
    const unsub = subscribeApiHandlers({
      name,
      params,
      refetchKey,
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
    });
    return unsub;
  }, [
    clearCache,
    refetchOnMount,
    subscribeApiHandlers,
    name,
    params,
    refetchKey,
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

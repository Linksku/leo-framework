import type { UseApiState } from 'stores/ApiStore';
import useDeepMemoObj from 'hooks/useDeepMemoObj';
import useDynamicCallback from 'hooks/useDynamicCallback';
import useUpdate from 'hooks/useUpdate';
import { useIsRouteActive } from 'stores/RouteStore';

type Opts<Name extends ApiName> = {
  shouldFetch?: boolean,
  returnState?: boolean,
  onFetch?: (results: ApiData<Name>) => void,
  onError?: (err: Error) => void,
  key?: string,
  refetchOnFocus?: boolean,
  refetchOnMount?: boolean,
};

type Return<Name extends ApiName> = {
  data: ApiData<Name> | null,
  fetching: boolean,
  fetchingFirstTime: boolean,
  error: any,
};

function useApi<Name extends ApiName, Opt extends Opts<Name>>(
  name: Name,
  params: Memoed<ApiParams<Name>>,
  opts: Opt,
): Opt['returnState'] extends true ? Return<Name> : void;

function useApi<Name extends ApiName>(
  name: Name,
  params: Memoed<ApiParams<Name>>,
  opts?: Opts<Name> & { returnState?: false },
): void;

function useApi<Name extends ApiName>(
  name: Name,
  params: Memoed<ApiParams<Name>>,
  {
    shouldFetch = true,
    returnState = false,
    onFetch,
    onError,
    key,
    refetchOnFocus,
    refetchOnMount,
  }: Opts<Name> = {},
): Return<Name> | void {
  useDebugValue(name);

  const {
    getApiState,
    subscribeApiHandlers,
    clearCache,
  } = useApiStore();
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const isRouteActive = useIsRouteActive();
    if (isRouteActive != null) {
      shouldFetch &&= isRouteActive;
    }
  } catch {}
  const stateRef = useRef<UseApiState<Name>>(
    useMemo(
      () => getApiState(name, params, shouldFetch),
      [getApiState, name, params, shouldFetch],
    ),
  );
  const update = useUpdate();
  const ref = useRef({
    ranFirstEffect: false,
    isFirstTime: true,
  });
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
      return NOOP;
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
      key,
      state: stateRef.current,
      update: returnState ? update : NOOP,
      onFetch: onFetchWrap,
      onError: onErrorWrap,
      refetchOnFocus,
    });
    return unsub;
  }, [
    clearCache,
    refetchOnMount,
    subscribeApiHandlers,
    name,
    params,
    key,
    update,
    returnState,
    onFetchWrap,
    onErrorWrap,
    shouldFetch,
    refetchOnFocus,
  ]);

  return {
    data: useDeepMemoObj(stateRef.current.data as ApiNameToData[Name]),
    fetching: stateRef.current.fetching,
    fetchingFirstTime: stateRef.current.isFirstTime && stateRef.current.fetching,
    error: stateRef.current.error,
  };
}

export default useApi;

import type { UseApiState } from 'stores/ApiStore';
import useDeepMemoObj from 'utils/hooks/useDeepMemoObj';
import useDynamicCallback from 'utils/hooks/useDynamicCallback';
import useUpdate from 'utils/hooks/useUpdate';

type Opts<Name extends ApiName> = {
  shouldFetch?: boolean,
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

function useApi<Name extends ApiName>(
  name: Name,
  params: ApiParams<Name>,
  {
    shouldFetch = true,
    onFetch,
    onError,
    key,
    refetchOnFocus,
    refetchOnMount,
  }: Opts<Name> = {},
): Return<Name> {
  useDebugValue(name);

  const paramsMemo = useDeepMemoObj(params) as Memoed<ApiParams<Name>>;
  const {
    getApiState,
    subscribeApiHandlers,
    clearCache,
  } = useApiStore();
  const stateRef = useRef<UseApiState<Name>>(
    getApiState(name, params, shouldFetch),
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
        clearCache(name, paramsMemo);
      }
    }

    // todo: low/mid fetch before render
    const unsub = subscribeApiHandlers({
      name,
      params: paramsMemo,
      key,
      state: stateRef.current,
      update,
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
    paramsMemo,
    key,
    update,
    onFetchWrap,
    onErrorWrap,
    shouldFetch,
    refetchOnFocus,
  ]);

  return {
    data: stateRef.current.data,
    fetching: stateRef.current.fetching,
    fetchingFirstTime: stateRef.current.isFirstTime && stateRef.current.fetching,
    error: stateRef.current.error,
  };
}

export default useApi;

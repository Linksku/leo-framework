import type { Revalidator, SWRConfiguration, SWRResponse } from 'swr';
import useSWR from 'swr';
import useMountedState from 'lib/hooks/useMountedState';

import type { EntityEvents } from 'lib/hooks/entities/useHandleEntityEvents';
import useDeepMemoObj from 'lib/hooks/useDeepMemoObj';
import { HTTP_TIMEOUT } from 'settings';
import useDynamicCallback from 'lib/hooks/useDynamicCallback';
import useHandleEntityEvents from 'lib/hooks/entities/useHandleEntityEvents';

type Opts<Name extends ApiName> = {
  shouldFetch?: boolean,
  onFetch?: OnApiFetch<Name>,
  onError?: OnApiError,
  swrConfig?: SWRConfiguration<ApiData<Name> | null>,
  revalidateOnEvents?: EntityEvents,
};

type Return<Name extends ApiName> = {
  data: ApiData<Name> | null,
  fetching: boolean,
  fetchingFirstTime: boolean,
  error: any,
  mutate: Memoed<SWRResponse<ApiData<Name> | null, any>['mutate']>,
  refetch: Memoed<() => void>,
};

// todo: mid/mid show more error UIs when APIs fail
function useApi<Name extends ApiName>(
  name: Name,
  params: ApiParams<Name>,
  {
    // If this is true once, changing to false doesn't do anything.
    shouldFetch = true,
    onFetch,
    onError,
    swrConfig,
    revalidateOnEvents,
  }: Opts<Name> = {},
): Return<Name> {
  useDebugValue(name);

  const paramsMemo = useDeepMemoObj(params) as Memoed<ApiParams<Name>>;
  const paramsStr = useMemo(() => JSON.stringify(paramsMemo), [paramsMemo]);
  const { queueBatchedRequest, clearCacheOnEvents } = useApiStore();
  const ref = useRef({
    hasFetched: false,
    fetchingFirstTime: true,
  });
  const isMounted = useMountedState();
  const cacheKey = useMemo(() => `${name},${JSON.stringify(paramsMemo)}`, [name, paramsMemo]);
  const [revalidateCount, setRevalidateCount] = useState(0);

  const onFetchWrap: OnApiFetch<Name> = useDynamicCallback((
    results: ApiData<Name>,
    params2: ApiParams<Name>,
  ) => {
    ref.current.fetchingFirstTime = false;
    clearCacheOnEvents(cacheKey, revalidateOnEvents);
    if (isMounted()) {
      onFetch?.(results, params2);
    }
  });

  const onErrorWrap = useDynamicCallback((err: Error) => {
    ref.current.fetchingFirstTime = false;
    clearCacheOnEvents(cacheKey, revalidateOnEvents);
    if (isMounted()) {
      onError?.(err);
    }
  });

  const swrRet = (
    // For filtering useSWR from why-did-you-render.
    function useSWRHack() {
      return useSWR<ApiData<Name> | null>(
        shouldFetch || ref.current.hasFetched ? [name, paramsStr, revalidateCount] : null,
        () => {
          ref.current.hasFetched = true;
          return queueBatchedRequest<Name>({
            name,
            params: paramsMemo,
            onFetch: onFetchWrap,
            onError: onErrorWrap,
          });
        },
        {
          // todo: low/mid fix refetching if refocusing right after load
          focusThrottleInterval: 60 * 1000,
          loadingTimeout: HTTP_TIMEOUT,
          onErrorRetry: (
            err: Error,
            _,
            config: SWRConfiguration,
            retry: Revalidator,
            { retryCount },
          ) => {
            if (!config.isVisible?.()) {
              return;
            }

            if (TS.getProp(err, 'status') !== 503) {
              return;
            }

            setTimeout(
              async () => retry({ retryCount: retryCount + 1 }),
              5000 * (2 ** Math.min(10, retryCount)),
            );
          },
          // Temp: https://github.com/vercel/swr/issues/1580
          dedupingInterval: 0,
          ...swrConfig,
        },
      );
    }()
  );

  // Mutate doesn't dedupe, refetch dedupes.
  const mutate = markMemoed(swrRet.mutate);
  const refetch = useCallback(() => setRevalidateCount(s => s + 1), []);

  // todo: mid/mid check if this revalidates immediately, don't revalidate if screen is hidden
  useHandleEntityEvents(
    revalidateOnEvents ?? EMPTY_ARR,
    refetch,
  );

  useEffect(() => {
    clearCacheOnEvents(cacheKey, revalidateOnEvents);
  }, [clearCacheOnEvents, cacheKey, revalidateOnEvents]);

  // swrRet has getters that trigger rerender.
  return {
    get data() {
      return (swrRet.data ?? null) as MemoDeep<ApiNameToData[Name]> | null;
    },
    get fetching() {
      return swrRet.isValidating;
    },
    get fetchingFirstTime() {
      return ref.current.fetchingFirstTime && swrRet.isValidating;
    },
    get error() {
      return swrRet.error;
    },
    mutate,
    refetch,
  };
}

export default useApi;

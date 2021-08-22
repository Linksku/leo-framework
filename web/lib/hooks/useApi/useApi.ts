import type { Revalidator, SWRConfiguration } from 'swr';
import useSWR from 'swr';
import useMountedState from 'react-use/lib/useMountedState';

import useDeepMemoObj from 'lib/hooks/useDeepMemoObj';
import { HTTP_TIMEOUT } from 'settings';
import useDynamicCallback from 'lib/hooks/useDynamicCallback';
import useAuthTokenLS from 'lib/hooks/localStorage/useAuthTokenLS';
import queueBatchedRequest from './queueBatchedRequest';
import useHandleApiEntities from './useHandleApiEntities';

type Opts<Name extends ApiName> = {
  shouldFetch?: boolean,
  key?: string,
  onFetch?: OnApiFetch<Name>,
  onError?: OnApiError,
  swrConfig?: SWRConfiguration<ApiData<Name> | null>,
};

type Return<Name extends ApiName> = {
  data: ApiData<Name> | null,
  fetching: boolean,
  fetchingFirstTime: boolean,
  error: Memoed<Error> | null,
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
    // When key changes, refetch.
    key,
    swrConfig,
  }: Opts<Name> = {},
): Return<Name> {
  useDebugValue(name);

  const paramsMemo = useDeepMemoObj(params as Pojo) as Memoed<ApiParams<Name>>;
  const [authToken] = useAuthTokenLS();
  const handleApiEntities = useHandleApiEntities<Name>('load');
  const ref = useRef({
    hasFetched: false,
    fetchingFirstTime: true,
  });
  const isMounted = useMountedState();

  const onFetchWrap: OnApiFetch<Name> = useDynamicCallback((
    results: ApiData<Name>,
  ) => {
    ref.current.fetchingFirstTime = false;
    if (isMounted()) {
      onFetch?.(results, {});
    }
  });

  const onErrorWrap = useDynamicCallback((err: Error) => {
    ref.current.fetchingFirstTime = false;
    if (isMounted()) {
      onError?.(err);
    }
  });

  const { data, isValidating, error } = useSWR<ApiData<Name> | null>(
    shouldFetch || ref.current.hasFetched ? [name, paramsMemo, key] : null,
    async () => {
      ref.current.hasFetched = true;
      try {
        return await queueBatchedRequest<Name>({
          name,
          params: paramsMemo,
          onFetch: onFetchWrap,
          onError: onErrorWrap,
          authToken,
          handleApiEntities,
        });
      } catch (err) {
        if (process.env.NODE_ENV === 'production') {
          ErrorLogger.warning(err, `useApi: ${name} failed`);
        } else {
          console.error(err);
        }
        throw err;
      }
    },
    {
      // todo: low/mid fix refetching if refocusing right after load
      focusThrottleInterval: 60 * 1000,
      loadingTimeout: HTTP_TIMEOUT,
      onErrorRetry: (
        err: Error,
        _,
        config: SWRConfiguration,
        revalidate: Revalidator,
        { retryCount },
      ) => {
        if (!config.isDocumentVisible?.()) {
          return;
        }

        if (err.status && err.status !== 503) {
          return;
        }

        setTimeout(
          async () => revalidate({ retryCount: retryCount + 1 }),
          5000 * (2 ** Math.min(10, retryCount)),
        );
      },
      ...swrConfig,
    },
  );

  return {
    data: data ?? null,
    fetching: isValidating,
    fetchingFirstTime: isValidating && ref.current.fetchingFirstTime,
    error,
  };
}

export default useApi;

import type { Revalidator, SWRConfiguration } from 'swr';
import useSWR from 'swr';

import useDeepMemoObj from 'lib/hooks/useDeepMemoObj';
import useLocalStorage from 'lib/hooks/useLocalStorage';
import { HTTP_TIMEOUT } from 'settings';
import useDynamicCallback from 'lib/hooks/useDynamicCallback';
import queueBatchedRequest from './queueBatchedRequest';
import useHandleApiEntities from './useHandleApiEntities';
import type { OnFetchType, OnErrorType } from './useApiTypes';

type Opts = {
  shouldFetch?: boolean,
  key?: string,
};

type OptsCallbacks<Name extends ApiName> = {
  onFetch: OnFetchType<Name>,
  onError: OnErrorType,
};

type Return<Name extends ApiName> = {
  data: Memoed<ApiNameToData[Name]> | null,
  fetching: boolean,
  fetchingFirstTime: boolean,
  error: Memoed<Error> | null,
};

function useApi<Name extends ApiName>(
  name: Name,
  params: ApiNameToParams[Name],
  opts?: Opts & OptsCallbacks<Name>,
): Return<Name>;

function useApi<Name extends ApiName>(
  name: Name,
  params: ApiNameToParams[Name],
  opts?: Opts,
): Return<Name>;

function useApi<Name extends ApiName>(
  name: Name,
  params: ApiNameToParams[Name],
  {
    // If this is true once, changing to false doesn't do anything.
    shouldFetch = true,
    onFetch,
    onError,
    // When key changes, refetch.
    key,
  }: Opts & Partial<OptsCallbacks<Name>> = {},
) {
  useDebugValue(name);

  const paramsMemo = useDeepMemoObj(params);
  const [authToken] = useLocalStorage('authToken', '', { raw: true });
  const handleApiEntities = useHandleApiEntities<Name>('load');
  const ref = useRef({
    mounted: false,
    hasFetched: false,
    fetchingFirstTime: true,
  });

  const onFetchWrap = useDynamicCallback(results => {
    ref.current.fetchingFirstTime = false;
    if (ref.current.mounted) {
      onFetch?.(results, {});
    }
  });

  const onErrorWrap = useDynamicCallback(results => {
    ref.current.fetchingFirstTime = false;
    if (ref.current.mounted) {
      onError?.(results);
    }
  });

  useEffect(() => {
    ref.current.mounted = true;

    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      ref.current.mounted = false;
    };
  }, []);

  const { data, isValidating, error } = useSWR<Memoed<ApiNameToData[Name]> | null>(
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

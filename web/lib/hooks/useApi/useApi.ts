import type { Revalidator, SWRConfiguration } from 'swr';
import useSWR from 'swr';

import useDeepMemoObj from 'lib/hooks/useDeepMemoObj';
import useLocalStorage from 'lib/hooks/useLocalStorage';
import { HTTP_TIMEOUT } from 'settings';
import queueBatchedRequest from './queueBatchedRequest';
import useHandleApiEntities from './useHandleApiEntities';
import type { OnFetchType, OnErrorType } from './useApiTypes';

type Opts = {
  shouldFetch?: boolean,
};

type OptsCallbacks<Name extends ApiName> = {
  onFetch: OnFetchType<Name>,
  onError: OnErrorType,
};

type Return<Name extends ApiName> = {
  data: Memoed<ApiNameToData[Name]> | null,
  fetching: boolean,
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
    shouldFetch = true,
    onFetch,
    onError,
  }: Opts & Partial<OptsCallbacks<Name>> = {},
) {
  useDebugValue(name);

  const paramsMemo = useDeepMemoObj(params);
  const [authToken] = useLocalStorage('authToken', '', { raw: true });
  const handleApiEntities = useHandleApiEntities<Name>('load');
  const ref = useRef({
    mounted: false,
    onFetch,
    onError,
  });
  ref.current.onFetch = onFetch;
  ref.current.onError = onError;

  const onFetchWrap = useCallback(results => {
    if (ref.current.mounted) {
      ref.current.onFetch?.(results, {});
    }
  }, []);

  const onErrorWrap = useCallback(results => {
    if (ref.current.mounted) {
      ref.current.onError?.(results);
    }
  }, []);

  useEffect(() => {
    ref.current.mounted = true;

    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      ref.current.mounted = false;
    };
  }, []);

  const { data, isValidating, error } = useSWR<Memoed<ApiNameToData[Name]> | null>(
    shouldFetch ? [name, paramsMemo] : null,
    async () => {
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
        ErrorLogger.warning(err, `useApi: ${name} failed`);
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
    error,
  };
}

export default useApi;

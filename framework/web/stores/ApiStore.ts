import { flushSync } from 'react-dom';

import useAuthTokenLS from 'utils/hooks/localStorage/useAuthTokenLS';
import fetcher from 'core/fetcher';
import ApiError from 'core/ApiError';
import { API_URL } from 'settings';
import isErrorResponse from 'utils/hooks/useApi/isErrorResponse';
import useHandleApiEntities from 'utils/hooks/useApi/useHandleApiEntities';
import useHandleErrorResponse from 'utils/hooks/useApi/useHandleErrorResponse';
import extraApiProps from 'utils/hooks/useApi/extraApiProps';
import deepFreezeIfDev from 'utils/deepFreezeIfDev';
import useDocumentEvent from 'utils/hooks/useDocumentEvent';
import TimeoutError from 'core/TimeoutError';

const MIN_STALE_DURATION = 60 * 1000;
const MAX_STALE_DURATION = 3 * 60 * 60 * 1000;

export type UseApiState<Name extends ApiName> = {
  apiId: string,
  data: ApiData<Name> | null,
  fetching: boolean,
  error: any,
  isFirstTime: boolean,
};

type ActiveApi<Name extends ApiName> = {
  name: Name,
  params: ApiParams<Name>,
  id: string,
  cacheKey?: string,
  cachedData: ApiData<Name> | null,
  cachedError: Error | null,
  fetching: boolean,
  lastFetched: number,
  refetchOnFocus: boolean,
  subs: {
    state: UseApiState<Name>,
    update: () => void,
    onFetch?: (results: ApiData<Name>) => void,
    onError?: (err: Error) => void,
  }[],
};

function _getApiId(name: ApiName, params: ApiParams<ApiName>) {
  return `${name},${params === EMPTY_OBJ ? '{}' : JSON.stringify(params)}`;
}

export const [
  ApiProvider,
  useApiStore,
] = constate(
  function ApiStore() {
    const ref = useRef({
      activeApis: Object.create(null) as ObjectOf<ActiveApi<any>>,
      batchTimer: null as number | null,
      batchedRequests: [] as {
        name: ApiName,
        params: ApiParams<ApiName>,
        id: string,
      }[],
    });
    const [authToken] = useAuthTokenLS();
    const handleErrorResponse = useHandleErrorResponse();
    const catchAsync = useCatchAsync();
    const handleApiEntities = useHandleApiEntities();

    const fetchNextBatch = useCallback(async () => {
      if (!ref.current.batchedRequests.length) {
        return;
      }
      ref.current.batchTimer = null;
      const curBatch = [...ref.current.batchedRequests];
      ref.current.batchedRequests = [];
      for (const [idx, b] of curBatch.entries()) {
        const api = ref.current.activeApis[b.id];
        if (api && !api.fetching) {
          api.fetching = true;
          api.lastFetched = performance.now();
        } else {
          curBatch.splice(idx, 1);
        }
      }
      if (!curBatch.length) {
        return;
      }

      for (const b of curBatch) {
        const api = TS.defined(ref.current.activeApis[b.id]);
        for (const sub of api.subs) {
          if (!sub.state.fetching) {
            sub.state.fetching = true;
            sub.update();
          }
        }
      }

      const { name, params } = curBatch[0];
      let fullResponse: MemoDeep<ApiResponse<any>>;
      let successResponse: MemoDeep<ApiSuccessResponse<any>>;
      let status: number;
      const isBatched = curBatch.length > 1;
      try {
        const { data: _fullResponse, status: _status } = isBatched
          ? await fetcher.get(
            `${API_URL}/api/batched`,
            {
              params: process.env.PRODUCTION
                ? JSON.stringify({
                  apis: curBatch.map(b => ({
                    name: b.name,
                    params: b.params,
                  })),
                })
                : `{"apis":[{
${curBatch.map(b => `  "name": ${JSON.stringify(b.name)},
  "params": ${JSON.stringify(b.params)}`).join('\n},{\n')}
}]}`,
              ...extraApiProps,
            },
            {
              authToken,
              priority: 'high',
            },
          )
          : await fetcher.get(
            `${API_URL}/api/${name}`,
            {
              params: JSON.stringify(params),
              ...extraApiProps,
            },
            {
              authToken,
              priority: 'high',
            },
          );
        fullResponse = _fullResponse as MemoDeep<ApiResponse<any>>;
        status = _status;

        if (isErrorResponse(fullResponse)) {
          if (!process.env.PRODUCTION && fullResponse.error.stack) {
            // eslint-disable-next-line no-console
            console.error(fullResponse.error.stack.join('\n'));
          }

          throw getErr(
            new ApiError(
              fullResponse.error.msg
                || (status === 503 || status >= 520
                  ? 'Server temporarily unavailable.'
                  : 'Unknown error occurred while fetching data.'),
              fullResponse.status ?? status,
            ),
            {
              ...fullResponse.error.debugCtx,
              ctx: 'ApiStore.fetchNextBatch',
              apiName: isBatched ? 'batched' : name,
              batchedNames: isBatched ? curBatch.map(v => v.name).join(',') : undefined,
              status: fullResponse.status ?? status,
              ...(fullResponse.error.stack && { stack: fullResponse.error.stack }),
            },
          );
        } else {
          successResponse = fullResponse;
        }

        if (isBatched && successResponse.data.results.length !== curBatch.length) {
          const err = new Error('ApiStore.fetchNextBatch: response has wrong length.');
          ErrorLogger.error(err);
          throw err;
        }
      } catch (_err) {
        const err = _err instanceof ApiError || _err instanceof TimeoutError
          ? _err
          : getErr(
            'ApiStore.fetchNextBatch: unknown API error occurred.',
            {
              apiName: isBatched ? 'batched' : name,
              batchedNames: isBatched ? curBatch.map(v => v.name).join(',') : undefined,
              err: _err,
            },
          );

        handleErrorResponse(err);

        for (const b of curBatch) {
          const api = ref.current.activeApis[b.id];
          if (api) {
            api.cachedData = null;
            api.cachedError = err;
            api.fetching = false;
            for (const sub of api.subs) {
              sub.state.data = null;
              sub.state.error = err;
              sub.state.fetching = false;
              sub.state.isFirstTime = false;
              sub.onError?.(err);
              sub.update();
            }
          }
        }
        return;
      }

      // Flush setState in onFetch together with useSyncExternalStore in useEntity
      flushSync(() => {
        handleApiEntities(successResponse);

        const results: MemoDeep<ApiErrorResponse | Pick<ApiSuccessResponse<any>, 'data'>>[]
          = deepFreezeIfDev(isBatched
            ? successResponse.data.results
            : [successResponse]);

        for (const [idx, result] of results.entries()) {
          const curApi = curBatch[idx];
          const api = ref.current.activeApis[curApi.id];
          if (isErrorResponse(result)) {
            if (!process.env.PRODUCTION && result?.error.stack) {
              // eslint-disable-next-line no-console
              console.error(result.error.stack.join('\n'));
            }

            const resultStatus = result.status ?? status;
            const err = getErr(
              new ApiError(
                resultStatus === 503 || resultStatus >= 520
                  ? 'Server temporarily unavailable.'
                  : 'Unknown error occurred while fetching data.',
                resultStatus,
              ),
              {
                ctx: 'ApiStore.fetchNextBatch',
                apiName: isBatched ? `batched(${curApi.name})` : name,
                status: fullResponse.status ?? status,
              },
            );
            handleErrorResponse(err);

            if (api) {
              api.cachedData = null;
              api.cachedError = err;
              api.fetching = false;
              for (const sub of api.subs) {
                sub.state.data = null;
                sub.state.error = err;
                sub.state.fetching = false;
                sub.state.isFirstTime = false;
                sub.onError?.(err);
                sub.update();
              }
            }
          } else if (api) {
            api.cachedData = result.data;
            api.cachedError = null;
            api.fetching = false;
            for (const sub of api.subs) {
              sub.state.data = result.data;
              sub.state.error = null;
              sub.state.fetching = false;
              sub.state.isFirstTime = false;
              sub.onFetch?.(result.data);
              sub.update();
            }
          }
        }
      });
    }, [authToken, handleApiEntities, handleErrorResponse]);

    const clearCache = useCallback((apiIdOrName: string, params?: any) => {
      const apiId = params ? _getApiId(apiIdOrName as ApiName, params) : apiIdOrName;
      const api = ref.current.activeApis[apiId];
      if (!api) {
        return;
      }

      api.cachedData = null;
      api.cachedError = null;
    }, []);

    const queueBatchedRequest = useCallback(<Name extends ApiName>(
      name: Name,
      params: ApiParams<Name>,
      _apiId?: string,
    ) => {
      const apiId = _apiId ?? _getApiId(name, params);
      if (!ref.current.batchedRequests.some(b => b.id === apiId)) {
        ref.current.batchedRequests.push({
          name,
          params,
          id: apiId,
        });
      }

      if (!ref.current.batchTimer) {
        ref.current.batchTimer = window.setTimeout(() => {
          catchAsync(fetchNextBatch(), 'ApiStore.fetchNextBatch');
        }, 0);
      }
    }, [catchAsync, fetchNextBatch]);

    const refetch = useCallback(<Name extends ApiName>(
      name: Name,
      params: ApiParams<Name>,
      _apiId?: string,
    ) => {
      const apiId = _apiId ?? _getApiId(name, params);
      clearCache(apiId);
      queueBatchedRequest(name, params, apiId);
    }, [clearCache, queueBatchedRequest]);

    const getApiState = useCallback(<Name extends ApiName>(
      name: Name,
      params: ApiParams<Name>,
      shouldFetch: boolean,
    ) => {
      const apiId = _getApiId(name, params);
      const api = ref.current.activeApis[apiId];
      const hasValidApi = api && api.lastFetched + MIN_STALE_DURATION > performance.now();
      return {
        apiId,
        data: hasValidApi
          ? api.cachedData as ApiData<Name>
          : null,
        fetching: api?.fetching || shouldFetch,
        error: hasValidApi
          ? api.cachedError
          : null,
        isFirstTime: !hasValidApi || (!api.cachedData && !api.cachedError),
      };
    }, []);

    const subscribeApiHandlers = useCallback(<Name extends ApiName>({
      name,
      params,
      key,
      state,
      update: update2,
      onFetch,
      onError,
      refetchOnFocus,
    }: {
      name: Name,
      params: ApiParams<Name>,
      key?: string,
      state: UseApiState<Name>,
      update: () => void,
      onFetch?: (results: ApiData<Name>) => void,
      onError?: (err: Error) => void,
      refetchOnFocus?: boolean,
    }): () => void => {
      const apiId = _getApiId(name, params);
      const api = TS.objValOrSetDefault(ref.current.activeApis, apiId, {
        name,
        params,
        id: apiId,
        cacheKey: key,
        cachedData: null,
        cachedError: null,
        fetching: false,
        lastFetched: Number.MIN_SAFE_INTEGER,
        subs: [],
        refetchOnFocus: true,
      });
      if (refetchOnFocus) {
        api.refetchOnFocus = true;
      }

      const sub = {
        state,
        update: update2,
        onFetch,
        onError,
      };
      api.subs.push(sub);

      if ((key && key !== api.cacheKey)
        || api.lastFetched + MIN_STALE_DURATION < performance.now()
        || (!api.cachedData && !api.cachedError)) {
        if (api.lastFetched > Number.MIN_SAFE_INTEGER) {
          clearCache(apiId);
        }

        api.cacheKey = key;
        queueBatchedRequest(name, params, apiId);
      } else if (api.cachedError) {
        onError?.(api.cachedError);
        if (state.data || state.error !== api.cachedError) {
          state.data = null;
          state.error = api.cachedError;
          update2();
        }
      } else if (api.cachedData) {
        // Note: onFetch needs to call setState
        onFetch?.(api.cachedData);
        if (state.error || state.data !== api.cachedData) {
          state.data = api.cachedData;
          state.error = null;
          update2();
        }
      }

      return () => {
        const api2 = ref.current.activeApis[apiId];
        if (api2) {
          const idx = api2.subs.indexOf(sub);
          if (idx >= 0) {
            api2.subs.splice(idx, 1);
          }
        }
      };
    }, [clearCache, queueBatchedRequest]);

    const mutateApiCache = useCallback(<Name extends ApiName>(name: Name) => (
      data: ApiNameToData[Name],
      params: ApiParams<Name>,
    ) => {
      const apiId = _getApiId(name, params);
      const api = ref.current.activeApis[apiId];
      if (api) {
        api.cachedData = deepFreezeIfDev(data);
        api.cachedError = null;
        api.lastFetched = performance.now();
        for (const sub of api.subs) {
          sub.state.data = data;
          sub.state.error = null;
          sub.state.isFirstTime = false;
          sub.update();
        }
      } else if (!process.env.PRODUCTION) {
        ErrorLogger.warn(new Error(`ApiStore.mutateApiCache(${name}): attempted to mutate inactive API`));
      }
    }, []);

    useEffect(() => {
      const clearCacheTimer = window.setInterval(() => {
        for (const api of TS.objValues(ref.current.activeApis)) {
          if (!api.subs.length) {
            continue;
          }
          if (api.lastFetched + MAX_STALE_DURATION < performance.now()) {
            refetch(api.name, api.params, api.id);
          } else if (api.lastFetched + MIN_STALE_DURATION < performance.now()) {
            clearCache(api.id);
          }
        }
      }, MIN_STALE_DURATION);

      return () => {
        window.clearInterval(clearCacheTimer);
      };
    }, [refetch, clearCache]);

    useDocumentEvent('visibilitychange', useCallback(() => {
      if (document.visibilityState === 'hidden') {
        return;
      }

      for (const api of TS.objValues(ref.current.activeApis)) {
        if (!api.refetchOnFocus || !api.subs.length) {
          continue;
        }

        if (api.lastFetched + MIN_STALE_DURATION < performance.now()) {
          refetch(api.name, api.params, api.id);
        }
      }
    }, [refetch]));

    return useMemo(() => ({
      clearCache,
      refetch,
      getApiState,
      subscribeApiHandlers,
      mutateApiCache,
    }), [
      clearCache,
      refetch,
      getApiState,
      subscribeApiHandlers,
      mutateApiCache,
    ]);
  },
);

function useMutateApiCache<Name extends ApiName>(name: Name) {
  const { mutateApiCache } = useApiStore();
  const mutate = mutateApiCache(name);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(mutate, [name]);
}

export { useMutateApiCache };

import type { EntityEvents } from 'lib/hooks/entities/useHandleEntityEvents';
import useAuthTokenLS from 'lib/hooks/localStorage/useAuthTokenLS';
import fetcher from 'lib/fetcher';
import ApiError from 'lib/ApiError';
import { HTTP_TIMEOUT, API_URL } from 'settings';
import isErrorResponse from 'lib/hooks/useApi/isErrorResponse';
import useHandleApiEntities from 'lib/hooks/useApi/useHandleApiEntities';
import useHandleErrorResponse from 'lib/hooks/useApi/useHandleErrorResponse';
import extraApiProps from 'lib/hooks/useApi/extraApiProps';

export interface BatchedRequest<Name extends ApiName> {
  name: Name,
  params: ApiParams<Name>,
  succPromise: (results: ApiData<Name>) => void,
  failPromise: (err: Error) => void,
}

const CACHE_EXPIRATION = 60 * 1000;

export const [
  ApiProvider,
  useApiStore,
] = constate(
  function ApiStore() {
    const ref = useRef({
      cache: Object.create(null) as ObjectOf<{
        data: any,
        err?: Error,
        expiration: number,
        unsubs?: (() => void)[],
      }>,
      batchTimer: null as number | null,
      batchedRequests: [] as BatchedRequest<any>[],
    });
    const [authToken] = useAuthTokenLS();
    const handleApiEntities = useHandleApiEntities();
    const handleErrorResponse = useHandleErrorResponse();
    const { addEntityListener } = useEntitiesStore();

    const fetchNextBatch = useCallback(async () => {
      if (!ref.current.batchedRequests.length) {
        return;
      }

      ref.current.batchTimer = null;
      const curBatch = ref.current.batchedRequests;
      ref.current.batchedRequests = [];
      const { name, params } = curBatch[0];
      try {
        const { data: fullResponse, status } = curBatch.length === 1
          ? await fetcher.get(
            `${API_URL}/api/${name}`,
            {
              params: JSON.stringify(params),
              ...extraApiProps,
            },
            {
              authToken,
              timeout: HTTP_TIMEOUT,
            },
          )
          : await fetcher.get(
            `${API_URL}/api/batched`,
            {
              params: JSON.stringify({
                apis: curBatch.map(b => ({
                  name: b.name,
                  params: b.params,
                })),
              }),
              ...extraApiProps,
            },
            {
              authToken,
              timeout: HTTP_TIMEOUT,
            },
          );

        if (isErrorResponse(fullResponse)) {
          if (process.env.NODE_ENV !== 'production' && fullResponse?.error.stack) {
            // eslint-disable-next-line no-console
            console.error(fullResponse.error.stack.join('\n'));
          }
          const err = new ApiError('batched', fullResponse?.status ?? status, fullResponse?.error);
          ErrorLogger.error(err, `Batched api failed ${fullResponse?.status ?? status ?? ''}`);
          throw err;
        }

        const results: MemoDeep<ApiResponse<any>>[] = curBatch.length === 1
          ? markMemoed([fullResponse])
          : (fullResponse as MemoDeep<ApiSuccessResponse<'batched'>>).data.results;
        if (results.length !== curBatch.length) {
          const err = new Error('Batched API response has wrong length.');
          ErrorLogger.error(err);
          throw err;
        }

        batchedUpdates(() => {
          handleApiEntities(fullResponse);
          for (const [idx, result] of results.entries()) {
            if (isErrorResponse(result)) {
              if (process.env.NODE_ENV !== 'production' && result?.error.stack) {
                // eslint-disable-next-line no-console
                console.error(result.error.stack.join('\n'));
              }
              const err = new ApiError(
                curBatch[idx].name,
                result.status ?? status,
                result.error,
              );

              handleErrorResponse({
                caller: 'queueBatchedRequest',
                name: curBatch[idx].name,
                status: err.status,
                err,
              });

              curBatch[idx].failPromise(err);
            } else {
              curBatch[idx].succPromise(result.data);
            }
          }
        });
      } catch (_err) {
        const err = _err instanceof Error
          ? _err
          : new Error('Unknown API error occurred.');

        handleErrorResponse({
          caller: 'queueBatchedRequest',
          name: curBatch.map(v => v.name).join(','),
          status: err instanceof ApiError ? err.status : 503,
          err,
        });

        batchedUpdates(() => {
          for (const b of curBatch) {
            b.failPromise(err);
          }
        });
      }
    }, [authToken, handleApiEntities, handleErrorResponse]);

    const clearCache = useCallback((cacheKey: string) => {
      const unsubs = ref.current.cache[cacheKey]?.unsubs ?? [];
      delete ref.current.cache[cacheKey];
      for (const unsub of unsubs) {
        unsub();
      }
    }, []);

    const clearCacheOnEvents = useCallback((
      cacheKey: string,
      events?: EntityEvents,
    ) => {
      const cached = ref.current.cache[cacheKey];
      if (!cached || !events?.length) {
        return;
      }

      const unsubs: (() => void)[] = [];
      for (const { actionType, entityType, id } of events) {
        if (id) {
          unsubs.push(
            addEntityListener(actionType, entityType, id, () => clearCache(cacheKey)),
          );
        } else {
          unsubs.push(
            addEntityListener(actionType, entityType, () => clearCache(cacheKey)),
          );
        }
      }
      cached.unsubs = unsubs;
    }, [addEntityListener, clearCache]);

    const queueBatchedRequest = useCallback(<Name extends ApiName>({
      name,
      params,
      onFetch,
      onError,
    }: {
      name: Name,
      params: ApiParams<Name>,
      onFetch?: OnApiFetch<Name>,
      onError?: OnApiError,
    }): Promise<ApiData<Name>> => {
      const cacheKey = `${name},${JSON.stringify(params)}`;
      const cached = ref.current.cache[cacheKey];
      if (cached) {
        if (cached.expiration < performance.now()) {
          clearCache(cacheKey);
        } else if (cached.err) {
          onError?.(cached.err);
          throw cached.err;
        } else {
          onFetch?.(cached.data, params);
          return cached.data;
        }
      }

      if (!ref.current.batchTimer) {
        ref.current.batchTimer = window.setTimeout(fetchNextBatch, 0);
      }
      return new Promise<ApiData<Name>>((succ, fail) => {
        ref.current.batchedRequests.push({
          name,
          params,
          succPromise: (data: ApiData<Name>) => {
            ref.current.cache[cacheKey] = {
              data,
              expiration: performance.now() + CACHE_EXPIRATION,
            };

            onFetch?.(data, params);
            succ(data);
          },
          failPromise: (err: Error) => {
            ref.current.cache[cacheKey] = {
              data: null,
              err,
              expiration: performance.now() + CACHE_EXPIRATION,
            };

            onError?.(err);
            fail(err);
          },
        });
      });
    }, [fetchNextBatch, clearCache]);

    useEffect(() => {
      const clearCacheTimer = window.setInterval(() => {
        for (const [k, cached] of TS.objEntries(ref.current.cache)) {
          if (cached.expiration < performance.now()) {
            clearCache(k);
          }
        }
      }, 1000);

      return () => {
        window.clearInterval(clearCacheTimer);
      };
    }, [clearCache]);

    return useDeepMemoObj({
      clearCache,
      clearCacheOnEvents,
      queueBatchedRequest,
    });
  },
);

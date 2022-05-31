import type { EntityEvents } from 'utils/hooks/entities/useHandleEntityEvents';
import useAuthTokenLS from 'utils/hooks/localStorage/useAuthTokenLS';
import fetcher from 'utils/fetcher';
import ApiError from 'utils/ApiError';
import { HTTP_TIMEOUT, API_URL } from 'settings';
import isErrorResponse from 'utils/hooks/useApi/isErrorResponse';
import useHandleApiEntities from 'utils/hooks/useApi/useHandleApiEntities';
import useHandleErrorResponse from 'utils/hooks/useApi/useHandleErrorResponse';
import extraApiProps from 'utils/hooks/useApi/extraApiProps';
import useUpdate from 'utils/hooks/useUpdate';

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
      relationsConfigs: Object.create(null) as ApiRelationsConfigs,
    });
    const [authToken] = useAuthTokenLS();
    const handleErrorResponse = useHandleErrorResponse();
    const { addEntityListener } = useEntitiesStore();
    const catchAsync = useCatchAsync();
    const update = useUpdate();

    const addRelationsConfigs = useCallback((configs: ApiRelationsConfigs) => {
      let changed = false;
      for (const [entityType, entityConfigs] of TS.objEntries(configs)) {
        for (const [relationName, config] of TS.objEntries(entityConfigs)) {
          const modelConfigs = TS.objValOrSetDefault(
            ref.current.relationsConfigs,
            entityType,
            Object.create(null),
          );
          if (!modelConfigs[relationName]) {
            modelConfigs[relationName] = config;
            changed = true;
          }
        }
      }

      if (changed) {
        update();
      }
    }, [update]);
    if (!process.env.PRODUCTION && typeof window !== 'undefined') {
      // @ts-ignore for debugging
      window.relationsConfigs = ref.current.relationsConfigs;
    }
    const handleApiEntities = useHandleApiEntities(addRelationsConfigs);

    const fetchNextBatch = useCallback(async () => {
      if (!ref.current.batchedRequests.length) {
        return;
      }

      ref.current.batchTimer = null;
      const curBatch = ref.current.batchedRequests;
      ref.current.batchedRequests = [];
      const { name, params } = curBatch[0];
      let fullResponse: MemoDeep<ApiResponse<any>>;
      let successResponse: MemoDeep<ApiSuccessResponse<any>>;
      let status: number;
      try {
        const { data: _fullResponse, status: _status } = curBatch.length === 1
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
        fullResponse = _fullResponse as unknown as MemoDeep<ApiResponse<any>>;
        status = _status;

        if (isErrorResponse(fullResponse)) {
          if (!process.env.PRODUCTION && fullResponse?.error.stack) {
            // eslint-disable-next-line no-console
            console.error(fullResponse.error.stack.join('\n'));
          }
          const err = new ApiError('batched', fullResponse?.status ?? status, fullResponse?.error);
          ErrorLogger.error(err, `Batched API failed ${fullResponse?.status ?? status ?? ''}`);
          throw err;
        } else {
          successResponse = fullResponse;
        }

        if (curBatch.length > 1 && successResponse.data.results.length !== curBatch.length) {
          const err = new Error('Batched API response has wrong length.');
          ErrorLogger.error(err);
          throw err;
        }
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
        return;
      }

      const results: MemoDeep<ApiErrorResponse | Pick<ApiSuccessResponse<any>, 'data'>>[]
        = curBatch.length === 1
          ? [successResponse]
          : successResponse.data.results;

      batchedUpdates(() => {
        handleApiEntities(successResponse);
        for (const [idx, result] of results.entries()) {
          if (isErrorResponse(result)) {
            if (!process.env.PRODUCTION && result?.error.stack) {
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
        ref.current.batchTimer = window.setTimeout(() => {
          void catchAsync(fetchNextBatch());
        }, 0);
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
    }, [fetchNextBatch, clearCache, catchAsync]);

    useEffect(() => {
      const clearCacheTimer = window.setInterval(() => {
        for (const [k, cached] of TS.objEntries(ref.current.cache)) {
          if (cached.expiration < performance.now()) {
            clearCache(k);
          }
        }
      }, 5000);

      return () => {
        window.clearInterval(clearCacheTimer);
      };
    }, [clearCache]);

    return useDeepMemoObj({
      clearCache,
      clearCacheOnEvents,
      queueBatchedRequest,
      addRelationsConfigs,
      relationsConfigs: ref.current.relationsConfigs,
    });
  },
);

import { flushSync } from 'react-dom';
import equal from 'fast-deep-equal';

import useAuthTokenStorage from 'hooks/storage/useAuthTokenStorage';
import fetcher from 'core/fetcher';
import ApiError from 'core/ApiError';
import { API_TIMEOUT, API_URL } from 'consts/server';
import isErrorResponse from 'hooks/api/isErrorResponse';
import useHandleApiEntities from 'hooks/api/useHandleApiEntities';
import useHandleErrorResponse from 'hooks/api/useHandleErrorResponse';
import extraApiProps from 'hooks/api/extraApiProps';
import deepFreezeIfDev from 'utils/deepFreezeIfDev';
import useDocumentEvent from 'hooks/useDocumentEvent';
import TimeoutError from 'core/TimeoutError';
import omit from 'utils/omit';
import safeParseJson from 'utils/safeParseJson';
import promiseTimeout from 'utils/promiseTimeout';

const MIN_STALE_DURATION = 60 * 1000;
const MAX_STALE_DURATION = 3 * 60 * 60 * 1000;

export type UseApiState<Name extends ApiName> = {
  apiId: string,
  data: ApiData<Name> | null,
  fetching: boolean,
  error: ApiError | null,
  isFirstTime: boolean,
  addedEntityIds: Stable<EntityId[]>,
  deletedEntityIds: Stable<Set<EntityId>>,
};

type Pagination = {
  initialCursor: string | null,
  curCursor: string | null,
  addedEntityIds: Stable<EntityId[]>,
  deletedEntityIds: Stable<Set<EntityId>>,
  unsubHandleCreateEntity: (() => void) | null,
  unsubHandleDeleteEntity: (() => void) | null,
};

export type ShouldAddCreatedEntity<T extends EntityType>
  = Stable<(ent: Entity<T>) => boolean> | true;

export type ApiOpts = {
  cacheBreaker?: string,
  refetchOnFocus: boolean,
  refetchIfStale: boolean,
  showToastOnError: boolean,
  batchInterval: number,
};

type ActiveApi<Name extends ApiName> = {
  name: Name,
  params: ApiParams<Name>,
  id: string,
  pagination: Pagination | null,
  cachedData: ApiData<Name> | null,
  prevCachedData?: ApiData<Name> | null,
  cachedError: ApiError | null,
  fetching: boolean,
  lastFetched: number,
  subs: {
    state: UseApiState<Name>,
    update: () => void,
    onFetch?: (results: ApiData<Name>) => void,
    onError?: (err: ApiError) => void,
  }[],
} & ApiOpts;

const ApiState = {
  activeApis: new Map<string, ActiveApi<any>>(),
  batchTimer: null as number | null,
  batchedRequests: [] as {
    name: ApiName,
    params: ApiParams<ApiName>,
    id: string,
  }[],
};

function _getApiId(
  name: ApiName,
  params: ApiParams<ApiName>,
  initialCursor?: string,
) {
  return [
    name,
    params === EMPTY_OBJ ? '{}' : JSON.stringify(params),
    initialCursor ?? '',
  ].join(',');
}

function _getErrMsg(data: unknown, status: number | undefined) {
  if (isErrorResponse(data) && data?.error?.msg) {
    return data.error.msg;
  }
  return status === 503 || (status && status >= 520)
    ? 'Server temporarily unavailable.'
    : 'Unknown error occurred while fetching data.';
}

export const [
  ApiProvider,
  useApiStore,
] = constate(
  function ApiStore() {
    const [authToken] = useAuthTokenStorage();
    const handleErrorResponse = useHandleErrorResponse();
    const catchAsync = useCatchAsync();
    const handleApiEntities = useHandleApiEntities();
    const { addEntityListener } = useEntitiesStore();

    const handleResponseBatch = useCallback(({
      api,
      response,
      fetchErr,
      fetchNextBatch,
    }: {
      api: ActiveApi<any>,
      response: StableDeep<ApiResponse<any>> | null,
      fetchErr?: ApiError,
      fetchNextBatch: () => Promise<void>,
    }) => {
      if (fetchErr || isErrorResponse(response)) {
        const status = response?.status;
        const err = fetchErr ?? new ApiError(
          _getErrMsg(response, status),
          status,
          {
            ctx: `ApiStore.handleResponseBatch(${api.name})`,
            apiName: api.name,
            status,
            stack: (response as ApiErrorResponse).error.stack?.join('\n'),
          },
        );
        handleErrorResponse(err, api.showToastOnError);

        if (api.pagination && api.cachedData) {
          (api.cachedData as PaginatedApiRet).hasCompleted = true;
        }

        api.cachedError = err;
        api.fetching = false;
        for (const sub of api.subs) {
          if (!api.pagination) {
            sub.state.data = null;
          }
          sub.state.error = err;
          sub.state.fetching = false;
          sub.state.isFirstTime = false;
          sub.onError?.(err);
          sub.update();
        }
      } else {
        if (api.pagination) {
          const oldData = api.cachedData as PaginatedApiRet | undefined;
          if (oldData) {
            api.pagination.curCursor = oldData.cursor ?? null;
          }

          const newData = response.data as PaginatedApiRet;
          if (!process.env.PRODUCTION && new Set(newData.items).size !== newData.items.length) {
            throw new Error(
              `ApiStore.handleResponseBatch(${api.name}): duplicate ids: ${newData.items.join(',')}`,
            );
          }

          const oldItems = oldData?.items ?? EMPTY_ARR;
          const oldItemsSet = new Set(oldItems);
          const newItems = newData.items.filter(item => !oldItemsSet.has(item));
          if (!process.env.PRODUCTION && newData.items.length - newItems.length > 1) {
            ErrorLogger.warn(new Error(
              `"${api.name}" api: ${newData.items.length - newItems.length}/${newData.items.length} are duplicates (cursor: "${api.pagination.curCursor}")`,
            ));
          }

          if (!newItems.length
            && newData.cursor !== oldData?.cursor
            && !ApiState.batchedRequests.some(b => b.id === api.id)) {
            // Note: if no new items, scroller won't trigger fetchNextPage
            ApiState.batchedRequests.push({
              name: api.name,
              params: omit(api.params, 'cursor'),
              id: api.id,
            });

            if (!ApiState.batchTimer) {
              ApiState.batchTimer = window.setTimeout(() => {
                catchAsync(
                  fetchNextBatch(),
                  `ApiStore.handleResponseBatch(${api.name})`,
                );
              }, api.batchInterval);
            }
          }

          const hasCompleted = newData.hasCompleted
            || !newData.cursor
            // Possibly bug refetching an earlier page
            || !!(oldData?.hasCompleted && !newItems.length)
            || newData.cursor === oldData?.cursor;
          if (newItems.length
            || newData.cursor !== oldData?.cursor
            || hasCompleted !== oldData?.hasCompleted) {
            const combinedData: PaginatedApiRet = {
              items: newItems.length
                ? [...oldItems, ...newItems]
                : oldItems,
              cursor: newData.cursor,
              hasCompleted,
            };
            api.cachedData = combinedData;

            api.pagination.addedEntityIds = markStable(api.pagination.addedEntityIds
              .filter(id => !newItems.includes(id)));
          }
        } else if (api.cachedData && equal(api.cachedData, response.data)) {
          // pass
        } else if (equal(api.prevCachedData, response.data)) {
          api.cachedData = api.prevCachedData;
        } else {
          api.cachedData = response.data;
        }

        api.cachedError = null;
        api.fetching = false;
        for (const sub of api.subs) {
          sub.state.data = api.cachedData;
          sub.state.error = null;
          sub.state.fetching = false;
          sub.state.isFirstTime = false;
          sub.onFetch?.(api.cachedData);
          sub.update();
        }
      }
    }, [handleErrorResponse, catchAsync]);

    const fetchNextBatch = useCallback(async () => {
      if (!ApiState.batchedRequests.length) {
        return;
      }

      ApiState.batchTimer = null;
      const curBatch = [...ApiState.batchedRequests];
      ApiState.batchedRequests = [];
      for (let i = 0; i < curBatch.length; i++) {
        const api = ApiState.activeApis.get(curBatch[i].id);
        if (api && !api.fetching) {
          api.fetching = true;
          api.lastFetched = performance.now();

          const cachedData = api.cachedData as PaginatedApiRet | undefined;
          const cursor = (
            cachedData?.hasCompleted && !api.cachedError
              ? api.pagination?.curCursor
              : cachedData?.cursor
          ) ?? api.pagination?.initialCursor;
          if (cursor) {
            if (!process.env.PRODUCTION && TS.hasProp(curBatch[i].params, 'cursor')) {
              throw new Error(
                'ApiStore.fetchNextBatch: existing cursor in params',
              );
            }

            curBatch[i].params = {
              ...curBatch[i].params,
              // @ts-ignore low-pri
              cursor,
            };
          }
        } else {
          curBatch.splice(i, 1);
        }
      }
      if (!curBatch.length) {
        return;
      }

      for (const b of curBatch) {
        const api = TS.defined(ApiState.activeApis.get(b.id));
        for (const sub of api.subs) {
          if (!sub.state.fetching) {
            sub.state.fetching = true;
            sub.update();
          }
        }
      }

      const startTime = performance.now();
      const remainingBatchIdx = new Set(curBatch.map((_, idx) => idx));
      let fetchErr: ApiError | undefined;
      try {
        const timeoutErr = new TimeoutError('Request timed out');
        const { res, status } = await promiseTimeout(
          fetcher.getResponse(
            `${API_URL}/api/stream`,
            {
              ...(process.env.PRODUCTION
                ? null
                : {
                  _: [...new Set(curBatch.map(b => b.name))].join('_'),
                }),
              apis: process.env.PRODUCTION
                ? JSON.stringify(curBatch.map(b => ({
                  name: b.name,
                  params: b.params,
                })))
                : `[{
  ${curBatch.map(b => `  "name": ${JSON.stringify(b.name)},
  "params": ${JSON.stringify(b.params)}`).join('\n},{\n')}
  }]`,
              ...extraApiProps,
            },
            {
              authToken,
              priority: 'high',
            },
          ),
          API_TIMEOUT,
          timeoutErr,
        );

        const stream = res && status < 400 ? res.body?.getReader() : null;
        if (!stream || status >= 400) {
          let data: unknown;
          if (res) {
            const text = await promiseTimeout(
              res.text(),
              API_TIMEOUT - (performance.now() - startTime),
              timeoutErr,
            );
            data = safeParseJson(text);
          }
          throw new ApiError(
            _getErrMsg(data, status),
            status,
            {
              ctx: 'ApiStore.fetchNextBatch',
              batchedApis: curBatch.map(v => v.name).join(','),
              status,
            },
          );
        }

        let fullResponse = '';
        let prevDelimiterIdx = 0;
        const decoder = new TextDecoder();
        while (true) {
          // eslint-disable-next-line no-await-in-loop
          const { value, done } = await promiseTimeout(
            stream.read(),
            API_TIMEOUT - (performance.now() - startTime),
            timeoutErr,
          );
          if (done) {
            break;
          }

          fullResponse += decoder.decode(value, { stream: true });
          let delimiterIdx = fullResponse.indexOf('\f', prevDelimiterIdx);
          if (delimiterIdx < 0) {
            continue;
          }

          const responses: {
            batchIdx: number,
            api: ActiveApi<any>,
            response: StableDeep<ApiResponse<any>> | null,
            hasHandler: boolean,
          }[] = [];
          while (delimiterIdx >= 0) {
            const json = fullResponse.slice(prevDelimiterIdx, delimiterIdx);
            const parsed = safeParseJson<{
              batchIdx: number,
              result: StableDeep<ApiResponse<ApiName>>
            }>(
              json,
              val => TS.isObj(val)
                && typeof val.batchIdx === 'number'
                && !!val.result,
            );
            if (parsed) {
              const { batchIdx, result: response } = parsed;
              const batch = curBatch[batchIdx];
              const api = ApiState.activeApis.get(batch.id) as ActiveApi<any>;

              responses.push({
                batchIdx,
                api,
                response,
                hasHandler: api.subs.some(sub => !!sub.onFetch || !!sub.onError),
              });
            } else if (!process.env.PRODUCTION) {
              throw getErr('ApiStore.fetchNextBatch: invalid json', {
                json: json.length > 200
                  ? `${json.slice(0, 100)}...${json.slice(-100)}`
                  : json,
              });
            }

            prevDelimiterIdx = delimiterIdx + 1;
            delimiterIdx = fullResponse.indexOf('\f', prevDelimiterIdx);
          }

          flushSync(() => {
            for (const { batchIdx, response } of responses) {
              remainingBatchIdx.delete(batchIdx);
              if (response && !isErrorResponse(response)) {
                handleApiEntities(response);
              }
            }

            for (const { api, response, hasHandler } of responses) {
              if (!hasHandler) {
                handleResponseBatch({
                  api,
                  response,
                  fetchNextBatch,
                });
              }
            }
          });

          // Flush setState in onFetch together with useSyncExternalStore in useEntity
          flushSync(() => {
            for (const { api, response, hasHandler } of responses) {
              if (hasHandler) {
                handleResponseBatch({
                  api,
                  response,
                  fetchNextBatch,
                });
              }
            }
          });
        }
      } catch (err) {
        // todo: mid/mid retry fetching on error
        if (err instanceof ApiError || err instanceof TimeoutError) {
          fetchErr = err;
        } else {
          if (err instanceof Error) {
            ErrorLogger.error(err, { ctx: 'ApiStore.fetchNextBatch' });
          }
          fetchErr = new ApiError(
            'Unknown API error occurred.',
            503,
            {
              ctx: 'ApiStore.fetchNextBatch',
              batchedApis: curBatch.map(b => b.name).join(','),
              err,
            },
          );
        }
      }

      if (remainingBatchIdx.size) {
        fetchErr = fetchErr ?? new ApiError(
          'Unknown API error occurred.',
          503,
          {
            ctx: 'ApiStore.fetchNextBatch',
            batchedApis: [...remainingBatchIdx]
              .map(idx => curBatch[idx].name).join(','),
          },
        );

        flushSync(() => {
          for (const batchIdx of remainingBatchIdx) {
            const batch = curBatch[batchIdx];
            handleResponseBatch({
              api: ApiState.activeApis.get(batch.id) as ActiveApi<any>,
              response: null,
              fetchErr,
              fetchNextBatch,
            });
          }
        });
      }
    }, [authToken, handleApiEntities, handleResponseBatch]);

    const clearCache = useCallback((apiIdOrName: string, params?: any) => {
      const apiId = params ? _getApiId(apiIdOrName as ApiName, params) : apiIdOrName;
      const api = ApiState.activeApis.get(apiId);
      if (!api) {
        return;
      }

      if (api.cachedData) {
        api.prevCachedData = api.cachedData;
      }
      api.cachedData = null;
      api.cachedError = null;
    }, []);

    const queueBatchedRequest = useCallback(<Name extends ApiName>(api: ActiveApi<Name>) => {
      if (ApiState.batchedRequests.some(b => b.id === api.id)) {
        return;
      }

      ApiState.batchedRequests.push({
        name: api.name,
        params: api.params,
        id: api.id,
      });

      if (!ApiState.batchTimer) {
        ApiState.batchTimer = window.setTimeout(() => {
          catchAsync(
            fetchNextBatch(),
            'ApiStore.fetchNextBatch',
          );
        }, api.batchInterval);
      }
    }, [catchAsync, fetchNextBatch]);

    const refetch = useCallback(<Name extends ApiName>(
      name: Name,
      params: ApiParams<Name>,
      _apiId?: string,
    ) => {
      const apiId = _apiId ?? _getApiId(name, params);
      clearCache(apiId);

      const api = ApiState.activeApis.get(apiId);
      if (api) {
        queueBatchedRequest(api);
      }
    }, [clearCache, queueBatchedRequest]);

    const fetchNextPage = useCallback(<Name extends ApiName>(
      name: Name,
      params: ApiParams<Name>,
      initialCursor?: string,
    ) => {
      const apiId = _getApiId(name, params, initialCursor);
      const api = ApiState.activeApis.get(apiId);
      if (api) {
        if (!api.pagination) {
          throw new Error(`ApiStore.fetchNextPage(${name}): API not paginated`);
        }

        queueBatchedRequest(api);
      }
    }, [queueBatchedRequest]);

    const getApiState = useCallback(<Name extends ApiName>({
      name,
      params,
      initialCursor,
      cacheBreaker,
      shouldFetch,
    }: {
      name: Name,
      params: ApiParams<Name>,
      initialCursor?: string,
      cacheBreaker?: string,
      shouldFetch?: boolean,
    }): UseApiState<Name> => {
      const apiId = _getApiId(name, params, initialCursor);
      const api = ApiState.activeApis.get(apiId);
      const hasValidApi = api
        && (!cacheBreaker || cacheBreaker === api.cacheBreaker)
        && api.lastFetched + MIN_STALE_DURATION > performance.now();
      return {
        apiId,
        data: hasValidApi
          ? api.cachedData as ApiData<Name>
          : null,
        fetching: api?.fetching
          || (!!shouldFetch && (!hasValidApi || !api.cachedData)),
        error: hasValidApi
          ? api.cachedError
          : null,
        isFirstTime: !hasValidApi || (!api.cachedData && !api.cachedError),
        addedEntityIds: api?.pagination?.addedEntityIds ?? EMPTY_ARR,
        deletedEntityIds: api?.pagination?.deletedEntityIds ?? markStable(new Set()),
      };
    }, []);

    const subscribeApiHandlers = useCallback(<Name extends ApiName>({
      name,
      params,
      isPaginated,
      cacheBreaker,
      state,
      update: updateSub,
      onFetch,
      onError,
      initialCursor,
      shouldAddCreatedEntity,
      shouldRemoveDeletedEntity = true,
      paginationEntityType,
      addEntitiesToEnd,
      refetchOnFocus = true,
      refetchIfStale = true,
      showToastOnError = true,
      batchInterval = 0,
    }: {
      name: Name,
      params: ApiParams<Name>,
      isPaginated?: boolean,
      cacheBreaker?: string,
      state: UseApiState<Name>,
      update: () => void,
      onFetch?: (results: ApiData<Name>) => void,
      onError?: (err: ApiError) => void,
      initialCursor?: string,
      shouldAddCreatedEntity?: ShouldAddCreatedEntity<EntityType>,
      shouldRemoveDeletedEntity?: boolean,
      paginationEntityType?: EntityType,
      addEntitiesToEnd?: boolean,
    } & Partial<ApiOpts>): () => void => {
      const apiId = _getApiId(name, params, initialCursor);
      if (!ApiState.activeApis.has(apiId)) {
        ApiState.activeApis.set(apiId, {
          name,
          params,
          id: apiId,
          pagination: isPaginated
            ? {
              initialCursor: initialCursor ?? null,
              curCursor: null,
              addedEntityIds: EMPTY_ARR,
              deletedEntityIds: markStable(new Set<ApiEntityId>()),
              unsubHandleCreateEntity: null,
              unsubHandleDeleteEntity: null,
            }
            : null,
          cacheBreaker,
          cachedData: null,
          cachedError: null,
          fetching: false,
          lastFetched: Number.MIN_SAFE_INTEGER,
          subs: [],
          refetchOnFocus,
          refetchIfStale,
          showToastOnError,
          batchInterval,
        });
      }
      const api = ApiState.activeApis.get(apiId) as ActiveApi<Name>;

      if (refetchOnFocus !== api.refetchOnFocus) {
        if (!process.env.PRODUCTION) {
          throw new Error(`ApiStore.subscribeApiHandlers(${name}): refetchOnFocus changed`);
        }
        api.refetchOnFocus = false;
      }
      if (refetchIfStale !== api.refetchIfStale) {
        if (!process.env.PRODUCTION) {
          throw new Error(`ApiStore.subscribeApiHandlers(${name}): refetchIfStale changed`);
        }
        api.refetchIfStale = true;
      }

      const sub = {
        state,
        update: updateSub,
        onFetch,
        onError,
      };
      api.subs.push(sub);

      if ((cacheBreaker && cacheBreaker !== api.cacheBreaker)
        || (api.refetchIfStale && api.lastFetched + MIN_STALE_DURATION < performance.now())
        || (!api.cachedData && !api.cachedError && !api.fetching)) {
        if (api.lastFetched > Number.MIN_SAFE_INTEGER) {
          clearCache(apiId);
        }

        api.cacheBreaker = cacheBreaker;
        queueBatchedRequest(api);
      } else if (api.cachedError || api.cachedData) {
        if (api.cachedError) {
          onError?.(api.cachedError);
        } else if (api.cachedData) {
          // Note: onFetch needs to call setState
          onFetch?.(api.cachedData);
        }

        if (state.data !== api.cachedData
          || state.error !== api.cachedError
          || state.fetching !== api.fetching
          || state.isFirstTime) {
          state.data = api.cachedData;
          state.error = api.cachedError;
          state.fetching = api.fetching;
          state.isFirstTime = false;
          updateSub();
        }
      } else if (api.fetching) {
        state.fetching = true;
        updateSub();
      }

      if (isPaginated && paginationEntityType) {
        const pagination = TS.notNull(api.pagination);

        if (shouldAddCreatedEntity && !pagination.unsubHandleCreateEntity) {
          // Note: idk how to handle callers with different shouldAddCreatedEntity
          pagination.unsubHandleCreateEntity = addEntityListener(
            'create',
            paginationEntityType,
            (ent: Entity) => {
              if ((shouldAddCreatedEntity === true || shouldAddCreatedEntity?.(ent))
                && !(api.cachedData as PaginatedApiRet | null)?.items.includes(ent.id)
                && !pagination.addedEntityIds.includes(ent.id)) {
                pagination.addedEntityIds = addEntitiesToEnd
                  ? markStable([...pagination.addedEntityIds, ent.id])
                  : markStable([ent.id, ...pagination.addedEntityIds]);

                for (const sub2 of api.subs) {
                  sub2.state.addedEntityIds = pagination.addedEntityIds;
                  sub2.update();
                }
              }
            },
          );
        }

        if (shouldRemoveDeletedEntity && !pagination.unsubHandleDeleteEntity) {
          pagination.unsubHandleDeleteEntity = addEntityListener(
            'delete',
            paginationEntityType,
            (ent: Entity) => {
              if (!pagination.deletedEntityIds.has(ent.id)) {
                pagination.deletedEntityIds = markStable(new Set(pagination.deletedEntityIds));
                pagination.deletedEntityIds.add(ent.id);

                for (const sub2 of api.subs) {
                  sub2.state.deletedEntityIds = pagination.deletedEntityIds;
                  sub2.update();
                }
              }
            },
          );
        }
      }

      return () => {
        const api2 = ApiState.activeApis.get(apiId);
        if (api2) {
          const idx = api2.subs.indexOf(sub);
          if (idx >= 0) {
            api2.subs.splice(idx, 1);
          }
        }
      };
    }, [clearCache, queueBatchedRequest, addEntityListener]);

    const subscribeApiState = useCallback(<Name extends ApiName>({
      name,
      params,
      initialCursor,
      state,
      update,
    }: {
      name: Name,
      params: ApiParams<Name>,
      initialCursor?: string,
      state: UseApiState<Name>,
      update: () => void,
    }) => {
      const apiId = _getApiId(name, params, initialCursor);
      const api = ApiState.activeApis.get(apiId);
      const sub = {
        state,
        update,
      };
      api?.subs.push(sub);

      return () => {
        const api2 = ApiState.activeApis.get(apiId);
        if (api2) {
          const idx = api2.subs.indexOf(sub);
          if (idx >= 0) {
            api2.subs.splice(idx, 1);
          }
        }
      };
    }, []);

    const mutateApiCache = useCallback(<Name extends ApiName>(name: Name) => (
      data: ApiNameToData[Name],
      params: ApiParams<Name>,
    ) => {
      const apiId = _getApiId(name, params);
      const api = ApiState.activeApis.get(apiId);
      if (api) {
        if (api.cachedData && equal(api.cachedData, data)) {
          // pass
        } else if (equal(api.prevCachedData, data)) {
          api.cachedData = api.prevCachedData;
        } else {
          api.cachedData = deepFreezeIfDev(data);
        }
        api.cachedError = null;
        api.lastFetched = performance.now();
        for (const sub of api.subs) {
          sub.state.data = api.cachedData;
          sub.state.error = null;
          sub.state.isFirstTime = false;
          sub.update();
        }
      } else if (!process.env.PRODUCTION) {
        ErrorLogger.warn(new Error(
          `ApiStore.mutateApiCache(${name}): attempted to mutate inactive API`,
        ));
      }
    }, []);

    useEffect(() => {
      const clearCacheTimer = window.setInterval(() => {
        for (const api of ApiState.activeApis.values()) {
          if (!api.refetchIfStale || !api.subs.length) {
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

      for (const api of ApiState.activeApis.values()) {
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
      fetchNextPage,
      getApiState,
      subscribeApiHandlers,
      subscribeApiState,
      mutateApiCache,
    }), [
      clearCache,
      refetch,
      fetchNextPage,
      getApiState,
      subscribeApiHandlers,
      subscribeApiState,
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

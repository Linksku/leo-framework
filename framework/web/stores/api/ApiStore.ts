import { flushSync } from 'react-dom';
import equal from 'fast-deep-equal';

import useAuthTokenStorage from 'core/storage/useAuthTokenStorage';
import fetcher from 'core/fetcher';
import ApiError from 'core/ApiError';
import { API_URL, MAX_API_TIMEOUT, STREAM_API_DELIM } from 'consts/server';
import isErrorResponse from 'stores/api/isErrorResponse';
import useHandleApiEntities from 'stores/api/useHandleApiEntities';
import useHandleErrorResponse from 'stores/api/useHandleErrorResponse';
import getExtraApiProps from 'stores/api/getExtraApiProps';
import TimeoutError from 'core/TimeoutError';
import omit from 'utils/omit';
import safeParseJson from 'utils/safeParseJson';
import promiseTimeout from 'utils/promiseTimeout';
import queueMicrotask from 'utils/queueMicrotask';
import { requestIdleCallback } from 'utils/requestIdleCallback';

export const MAX_PER_BATCH = 50;
export const MIN_STALE_DURATION = 60 * 1000;
export const MAX_STALE_DURATION = 3 * 60 * 60 * 1000;

export type UseApiState<Name extends ApiName> = {
  lastFetchedId: string | null,
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
  key?: string,
  cacheBreaker?: string,
  refetchOnFocus: boolean,
  refetchOnConnect: boolean,
  refetchIfStale: boolean,
  showToastOnError: boolean,
  batchInterval: number,
  immediate?: boolean,
};

type Sub<Name extends ApiName> = {
  state: UseApiState<Name>,
  update: () => void,
  routeKey: string | undefined,
  onFetch?: (results: ApiData<Name>) => void,
  onError?: (err: ApiError) => void,
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
  fetchSuccessTime: number,
  subs: Sub<Name>[],
} & ApiOpts;

const ApiState = {
  activeApis: new Map<string, ActiveApi<any>>(),
  // For subscribeApiState called before subscribeApiHandlers
  pendingSubs: new Map<string, Sub<any>[]>(),
  queuedBatch: false,
  batchedRequests: [] as {
    name: ApiName,
    params: ApiParams<ApiName>,
    id: string,
  }[],
};

export function getApiId(
  name: ApiName,
  params: ApiParams<ApiName>,
  initialCursor?: string,
): string {
  return [
    name,
    params === EMPTY_OBJ ? '{}' : JSON.stringify(params),
    initialCursor ?? '',
  ].join(',');
}

export function getApi(
  name: ApiName,
  params: ApiParams<ApiName>,
  initialCursor?: string,
) {
  return ApiState.activeApis.get(getApiId(name, params, initialCursor));
}

function _getErrMsg(data: unknown, status: number | undefined) {
  if (isErrorResponse(data) && data?.error?.msg) {
    return data.error.msg;
  }
  return status === 503 || (status && status >= 520)
    ? 'Server temporarily unavailable.'
    : 'Unknown error occurred while fetching data.';
}

export function apiNeedsFetch(
  api: ActiveApi<any>,
  key: Nullish<string>,
  cacheBreaker: Nullish<string>,
) {
  return (key && key !== api.key)
    || (cacheBreaker && cacheBreaker !== api.cacheBreaker)
    || (api.refetchIfStale && performance.now() - api.fetchSuccessTime > MIN_STALE_DURATION)
    || (!api.cachedData && !api.cachedError && !api.fetching);
}

function _updateApiData(api: ActiveApi<any>, data: any) {
  if (api.cachedData && equal(api.cachedData, data)) {
    // pass
  } else if (equal(api.prevCachedData, data)) {
    api.cachedData = api.prevCachedData;
  } else {
    api.cachedData = data;
  }

  api.cachedError = null;
  api.fetching = false;
  api.fetchSuccessTime = performance.now();
  for (const sub of api.subs) {
    sub.state.lastFetchedId = api.id;
    sub.state.data = api.cachedData;
    sub.state.error = null;
    sub.state.fetching = false;
    sub.state.isFirstTime = false;
    sub.onFetch?.(api.cachedData);
    sub.update();
  }
}

export const [
  ApiProvider,
  useApiStore,
  useMutateApiCache,
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
        let err = fetchErr;
        if (!err) {
          const responseErr = (response as ApiErrorResponse).error;
          err = new ApiError(
            _getErrMsg(response, status),
            {
              status: status ?? 503,
              code: responseErr.code,
              debugCtx: {
                ctx: `ApiStore.handleResponseBatch(${api.name})`,
                apiName: api.name,
                status,
                stack: responseErr.stack?.join('\n'),
              },
            },
          );
        }

        const reuseStaleData = (api.cachedData || api.prevCachedData)
          && performance.now() - api.fetchSuccessTime < MAX_STALE_DURATION;

        handleErrorResponse(
          err,
          reuseStaleData ? false : api.showToastOnError,
        );

        if (reuseStaleData) {
          if (!api.cachedData) {
            api.cachedData = api.prevCachedData;
          }
          api.cachedError = null;
        } else {
          if (api.pagination) {
            if (api.cachedData) {
              (api.cachedData as PaginatedApiRet).hasCompleted = true;
            }
          } else {
            api.cachedData = null;
          }
          api.cachedError = err;
        }

        api.fetching = false;
        for (const sub of api.subs) {
          sub.state.lastFetchedId = api.id;
          sub.state.data = api.cachedData;
          sub.state.error = api.cachedError;
          sub.state.fetching = false;
          sub.state.isFirstTime = false;
          sub.onError?.(err);
          sub.update();
        }
      } else if (api.pagination) {
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
          && !newData.hasCompleted
          && newData.cursor !== oldData?.cursor
          && !ApiState.batchedRequests.some(b => b.id === api.id)) {
          // Note: if no new items, scroller won't trigger fetchNextPage
          ApiState.batchedRequests.push({
            name: api.name,
            params: omit(api.params, 'cursor'),
            id: api.id,
          });

          if (!ApiState.queuedBatch) {
            window.setTimeout(() => {
              catchAsync(
                fetchNextBatch(),
                `ApiStore.fetchNextBatch(${api.name})`,
              );
            }, api.batchInterval);
            ApiState.queuedBatch = true;
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
              ? oldItems.concat(newItems)
              : oldItems,
            cursor: newData.cursor,
            hasCompleted,
          };
          api.cachedData = combinedData;

          api.pagination.addedEntityIds = markStable(api.pagination.addedEntityIds
            .filter(id => !newItems.includes(id)));
        }

        _updateApiData(api, api.cachedData);
      } else {
        _updateApiData(api, response.data);
      }
    }, [handleErrorResponse, catchAsync]);

    const fetchNextBatch = useCallback(async () => {
      ApiState.queuedBatch = false;
      if (!ApiState.batchedRequests.length) {
        return;
      }

      const curBatch = ApiState.batchedRequests.slice(0, MAX_PER_BATCH);
      ApiState.batchedRequests = ApiState.batchedRequests.slice(MAX_PER_BATCH);
      if (ApiState.batchedRequests.length) {
        catchAsync(
          fetchNextBatch(),
          'ApiStore.fetchNextBatch',
        );
      }

      for (let i = 0; i < curBatch.length; i++) {
        const api = ApiState.activeApis.get(curBatch[i].id);
        if (api && !api.fetching) {
          api.fetching = true;

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
              // Error depends on API types
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
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
        const extraApiProps = await getExtraApiProps();
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
          {
            timeout: MAX_API_TIMEOUT,
            getErr: () => new TimeoutError('Request timed out'),
          },
        );

        const stream = res && status < 400 ? res.body?.getReader() : null;
        if (!stream || status >= 400) {
          let data: unknown;
          if (res) {
            const text = await promiseTimeout(
              res.text(),
              {
                timeout: MAX_API_TIMEOUT - (performance.now() - startTime),
                getErr: () => new TimeoutError('Request timed out'),
              },
            );
            data = safeParseJson(text);
          }
          throw new ApiError(
            _getErrMsg(data, status),
            {
              status,
              debugCtx: {
                ctx: 'ApiStore.fetchNextBatch',
                batchedApis: curBatch.map(v => v.name).join(','),
                status,
              },
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
            {
              timeout: MAX_API_TIMEOUT - (performance.now() - startTime),
              getErr: () => new TimeoutError('Request timed out'),
            },
          );
          if (done) {
            break;
          }

          fullResponse += decoder.decode(value, { stream: true });
          let delimiterIdx = fullResponse.indexOf(STREAM_API_DELIM, prevDelimiterIdx);
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
            const json = fullResponse.slice(
              prevDelimiterIdx + 1, // [ or comma
              delimiterIdx,
            );
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

            prevDelimiterIdx = delimiterIdx + STREAM_API_DELIM.length;
            delimiterIdx = fullResponse.indexOf(STREAM_API_DELIM, prevDelimiterIdx);
          }

          const processResponses = () => {
            for (const { batchIdx, response } of responses) {
              remainingBatchIdx.delete(batchIdx);
              if (response && !isErrorResponse(response)) {
                handleApiEntities(response);
              }
            }

            for (const { api, response, hasHandler } of responses) {
              if (!hasHandler) {
                requestIdleCallback(() => {
                  handleResponseBatch({
                    api,
                    response,
                    fetchNextBatch,
                  });
                }, { timeout: 500 });
              }
            }
          };
          const responsesWithHandlers = responses.filter(r => r.hasHandler);
          if (responsesWithHandlers.length) {
            // Flush to allow handlers to have latest entities
            flushSync(processResponses);

            for (const { api, response, hasHandler } of responsesWithHandlers) {
              if (hasHandler) {
                requestIdleCallback(() => {
                  handleResponseBatch({
                    api,
                    response,
                    fetchNextBatch,
                  });
                }, { timeout: 500 });
              }
            }
          } else {
            processResponses();
          }
        }
      } catch (err) {
        if (err instanceof ApiError || err instanceof TimeoutError) {
          fetchErr = err;
        } else {
          if (err instanceof Error) {
            ErrorLogger.error(err, { ctx: 'ApiStore.fetchNextBatch' });
          }
          fetchErr = new ApiError(
            'Unknown API error occurred.',
            {
              status: 503,
              debugCtx: {
                ctx: 'ApiStore.fetchNextBatch',
                batchedApis: curBatch.map(b => b.name).join(','),
                err,
              },
            },
          );
        }
      }

      if (remainingBatchIdx.size) {
        fetchErr = fetchErr ?? new ApiError(
          'Unknown API error occurred.',
          {
            status: 503,
            debugCtx: {
              ctx: 'ApiStore.fetchNextBatch',
              batchedApis: [...remainingBatchIdx]
                .map(idx => curBatch[idx].name).join(','),
            },
          },
        );

        for (const batchIdx of remainingBatchIdx) {
          const batch = curBatch[batchIdx];
          handleResponseBatch({
            api: ApiState.activeApis.get(batch.id) as ActiveApi<any>,
            response: null,
            fetchErr,
            fetchNextBatch,
          });
        }
      }
    }, [authToken, handleApiEntities, handleResponseBatch, catchAsync]);

    const clearCache = useCallback((apiIdOrName: string, params?: any) => {
      const apiId = params ? getApiId(apiIdOrName as ApiName, params) : apiIdOrName;
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

    const queueBatchedRequest = useCallback(<Name extends ApiName>(
      api: ActiveApi<Name>,
      immediate?: boolean,
    ) => {
      if (ApiState.batchedRequests.some(b => b.id === api.id)) {
        return;
      }
      ApiState.batchedRequests.push({
        name: api.name,
        params: api.params,
        id: api.id,
      });

      if (!ApiState.queuedBatch) {
        if (immediate) {
          catchAsync(
            fetchNextBatch(),
            'ApiStore.fetchNextBatch',
          );
        } else if (api.batchInterval) {
          window.setTimeout(() => {
            catchAsync(
              fetchNextBatch(),
              `ApiStore.handleResponseBatch(${api.name})`,
            );
          }, api.batchInterval);
          ApiState.queuedBatch = true;
        } else {
          queueMicrotask(() => {
            catchAsync(
              fetchNextBatch(),
              `ApiStore.handleResponseBatch(${api.name})`,
            );
          });
          ApiState.queuedBatch = true;
        }
      }
    }, [catchAsync, fetchNextBatch]);

    const refetch = useCallback(<Name extends ApiName>(
      name: Name,
      params: ApiParams<Name>,
      _apiId?: string,
    ) => {
      const apiId = _apiId ?? getApiId(name, params);
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
      const apiId = getApiId(name, params, initialCursor);
      const api = ApiState.activeApis.get(apiId);
      if (api) {
        if (!api.pagination) {
          throw new Error(`ApiStore.fetchNextPage(${name}): API not paginated`);
        }

        queueBatchedRequest(api, true);
      }
    }, [queueBatchedRequest]);

    const getApiState = useCallback(<Name extends ApiName>({
      name,
      params,
      initialCursor,
      key,
      cacheBreaker,
    }: {
      name: Name,
      params: ApiParams<Name>,
      initialCursor?: string,
      key?: string,
      cacheBreaker?: string,
    }): UseApiState<Name> => {
      const apiId = getApiId(name, params, initialCursor);
      const api = ApiState.activeApis.get(apiId);
      const hasValidApi = api && !apiNeedsFetch(api, key, cacheBreaker);
      return {
        lastFetchedId: null,
        data: hasValidApi
          ? api.cachedData as ApiData<Name>
          : null,
        fetching: !!api?.fetching,
        error: hasValidApi
          ? api.cachedError
          : null,
        isFirstTime: !api || (!api.cachedData && !api.cachedError),
        addedEntityIds: api?.pagination?.addedEntityIds ?? EMPTY_ARR,
        deletedEntityIds: api?.pagination?.deletedEntityIds ?? markStable(new Set()),
      };
    }, []);

    const subscribeApiHandlers = useCallback(<Name extends ApiName>({
      name,
      params,
      isPaginated,
      key,
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
      routeKey,
      refetchOnFocus = true,
      refetchOnConnect = true,
      refetchIfStale = true,
      showToastOnError = true,
      batchInterval = 0,
      immediate = false,
    }: {
      name: Name,
      params: ApiParams<Name>,
      isPaginated?: boolean,
      key?: string,
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
      routeKey?: string,
    } & Partial<ApiOpts>): () => void => {
      const apiId = getApiId(name, params, initialCursor);
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
          key,
          cacheBreaker,
          cachedData: null,
          cachedError: null,
          fetching: false,
          fetchSuccessTime: Number.MIN_SAFE_INTEGER,
          subs: ApiState.pendingSubs.get(apiId) ?? [],
          // Used in RefetchApiHandlers
          refetchOnFocus,
          refetchOnConnect,
          refetchIfStale,
          showToastOnError,
          batchInterval,
        });
        ApiState.pendingSubs.delete(apiId);
      }
      const api = ApiState.activeApis.get(apiId) as ActiveApi<Name>;

      if (refetchOnFocus !== api.refetchOnFocus) {
        if (!process.env.PRODUCTION) {
          throw new Error(`ApiStore.subscribeApiHandlers(${name}): refetchOnFocus changed`);
        }
        api.refetchOnFocus = false;
      }
      if (refetchOnConnect !== api.refetchOnConnect) {
        if (!process.env.PRODUCTION) {
          throw new Error(`ApiStore.subscribeApiHandlers(${name}): refetchOnConnect changed`);
        }
        api.refetchOnConnect = false;
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
        routeKey,
        onFetch,
        onError,
      };
      api.subs.push(sub);

      if (apiNeedsFetch(api, key, cacheBreaker)) {
        if (api.fetchSuccessTime > Number.MIN_SAFE_INTEGER) {
          clearCache(apiId);
        }

        api.key = key;
        api.cacheBreaker = cacheBreaker;
        queueBatchedRequest(api, immediate);
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
          state.lastFetchedId = api.id;
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
                  ? markStable(pagination.addedEntityIds.concat(ent.id))
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
      routeKey,
    }: {
      name: Name,
      params: ApiParams<Name>,
      initialCursor?: string,
      state: UseApiState<Name>,
      update: () => void,
      routeKey?: string,
    }) => {
      const apiId = getApiId(name, params, initialCursor);
      const api = ApiState.activeApis.get(apiId);
      const sub = {
        state,
        update,
        routeKey,
      };
      if (api) {
        api.subs.push(sub);
      } else {
        const pendingSubs = ApiState.pendingSubs.get(apiId) ?? [];
        pendingSubs.push(sub);
        ApiState.pendingSubs.set(apiId, pendingSubs);
      }

      return () => {
        const api2 = ApiState.activeApis.get(apiId);
        if (api2) {
          const idx = api2.subs.indexOf(sub);
          if (idx >= 0) {
            api2.subs.splice(idx, 1);
          }
        } else {
          const pendingSubs = ApiState.pendingSubs.get(apiId);
          if (pendingSubs) {
            const idx = pendingSubs.indexOf(sub);
            if (idx >= 0) {
              pendingSubs.splice(idx, 1);
            }
          }
        }
      };
    }, []);

    const mutateApiCache = useCallback(<Name extends ApiName>(
      name: Name,
      params: ApiParams<Name>,
      data: ApiNameToData[Name] | ((prev: ApiNameToData[Name]) => ApiNameToData[Name]),
    ) => {
      const apiId = getApiId(name, params);
      const api = ApiState.activeApis.get(apiId);
      if (api) {
        _updateApiData(
          api,
          typeof data === 'function'
            ? data(api.cachedData as ApiNameToData[Name])
            : data,
        );
      } else if (!process.env.PRODUCTION) {
        ErrorLogger.warn(new Error(
          `ApiStore.mutateApiCache(${name}): attempted to mutate inactive API`,
        ));
      }
    }, []);

    const getActiveApis = useCallback(() => Array.from(ApiState.activeApis.values()), []);

    return useMemo(() => ({
      clearCache,
      refetch,
      fetchNextPage,
      getApiState,
      subscribeApiHandlers,
      subscribeApiState,
      mutateApiCache,
      getActiveApis,
    }), [
      clearCache,
      refetch,
      fetchNextPage,
      getApiState,
      subscribeApiHandlers,
      subscribeApiState,
      mutateApiCache,
      getActiveApis,
    ]);
  },
  function ApiStore(val) {
    return val;
  },
  function MutateApiCache(val) {
    return val.mutateApiCache;
  },
);

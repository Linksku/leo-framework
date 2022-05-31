import fetcher from 'utils/fetcher';
import removeUndefinedValues from 'utils/removeUndefinedValues';
import { HTTP_TIMEOUT, API_URL } from 'settings';
import ApiError from 'utils/ApiError';
import useEffectIfReady from 'utils/hooks/useEffectIfReady';
import useUpdate from 'utils/hooks/useUpdate';
import useHandleApiEntities from './useHandleApiEntities';
import isErrorResponse from './isErrorResponse';
import useHandleErrorResponse from './useHandleErrorResponse';
import extraApiProps from './extraApiProps';

type Opts<Name extends ApiName> = {
  type?: EntityAction,
  method?: 'get' | 'post' | 'postForm' | 'patch' | 'put' | 'delete',
  concurrentMode?: 'allowConcurrent' | 'ignoreNext' | 'ignorePrev',
  cancelOnUnmount?: boolean,
  noReturnState?: boolean,
  successMsg?: string,
  showToastOnError?: boolean,
  onFetch?: OnApiFetch<Name>,
  onError?: OnApiError,
};

type State<Name extends ApiName> = {
  data: ApiData<Name> | null,
  fetching: boolean,
  error: Memoed<Error> | null,
};

type FetchApi<
  Name extends ApiName,
  Params extends Partial<ApiParams<Name>>
> = Memoed<(
  params?: Omit<ApiParams<Name>, RequiredKeys<Params>> & { preventDefault?: never },
  files?: ObjectOf<File | File[]>,
) => Promise<ApiData<Name> | null>>;

type Return<
  Name extends ApiName,
  Params extends Partial<ApiParams<Name>>
> = {
  fetchApi: FetchApi<Name, Params>,
  resetApi: Memoed<(cancelFetching?: boolean) => void>,
};

function useDeferredApi<
  Name extends ApiName,
  Params extends Partial<ApiParams<Name>>
>(
  name: Name,
  params: Params,
  opts: Opts<Name> & { noReturnState: true },
): Return<Name, Params>;

function useDeferredApi<
  Name extends ApiName,
  Params extends Partial<ApiParams<Name>>
>(
  name: Name,
  params?: Params,
  opts?: Opts<Name> & { noReturnState?: false },
): Return<Name, Params> & State<Name>;

function useDeferredApi<
  Name extends ApiName,
  Params extends Partial<ApiParams<Name>>
>(
  name: Name,
  // todo: low/mid make sure combinedParams matches ApiNameToParams
  // doesn't need useMemo because of useDeepMemoObj.
  params: Params,
  {
    type = 'load',
    method: _method,
    onFetch,
    onError,
    cancelOnUnmount = true,
    // Don't call setState.
    noReturnState = false,
    successMsg,
    showToastOnError = true,
  }: Opts<Name> = {},
) {
  useDebugValue(name);

  const method = _method ?? (type === 'load' ? 'get' : 'post');

  const paramsMemo = useDeepMemoObj(params as Pojo) as Memoed<ApiParams<Name>>;
  const stateRef = useRef<State<Name>>({
    data: null,
    fetching: false,
    error: null,
  });
  const update = useUpdate();
  const ref = useRef({
    isFetching: false,
    numFetches: 0,
    numCancelled: 0,
    onFetch,
    onError,
    fetchApiParams: null as Memoed<ApiParams<Name>> | null,
  });
  ref.current.onFetch = onFetch;
  ref.current.onError = onError;
  const { authToken } = useAuthStore();
  const { addRelationsConfigs } = useApiStore();
  const handleApiEntities = useHandleApiEntities(addRelationsConfigs, type !== 'load');
  const handleErrorResponse = useHandleErrorResponse();
  const showToast = useShowToast();

  const fetchApi: FetchApi<Name, Params> = useCallback(
    async (params2, files) => {
      if (!process.env.PRODUCTION && files
        && !Object.values(files).every(f => {
          if (Array.isArray(f)) {
            return f.every(f2 => f2 instanceof File);
          }
          return f == null || f instanceof File;
        })) {
        throw new Error('fetchApi files aren\'t all files.');
      }

      if (ref.current.isFetching) {
        return null;
      }

      ref.current.numFetches++;
      const { numFetches } = ref.current;
      ref.current.isFetching = true;
      stateRef.current.fetching = true;
      if (!noReturnState) {
        update();
      }
      // ObjectOf<
      //   Nullable<ApiParams<Name>>["currentUserId"] | undefined
      // >
      const combinedParams = { ...paramsMemo, ...params2 } as unknown as ApiParams<Name>;

      try {
        const { data: response, status } = await fetcher[method](
          `${API_URL}/api/${name}`,
          {
            ...files,
            params: JSON.stringify(removeUndefinedValues(combinedParams)),
            ...extraApiProps,
          },
          {
            authToken,
            timeout: HTTP_TIMEOUT,
          },
        );

        ref.current.isFetching = false;
        if (numFetches <= ref.current.numCancelled) {
          // If cache gets updated for cancelled requests, entities also need to be updated.
          return null;
        }

        if (isErrorResponse(response)) {
          throw new ApiError(name, response?.status ?? status, response?.error);
        }

        const successResponse = response as MemoDeep<ApiSuccessResponse<Name>>;
        const { data } = successResponse;
        batchedUpdates(() => {
          handleApiEntities(successResponse);
          stateRef.current.fetching = false;
          stateRef.current.data = data;
          stateRef.current.error = null;
          ref.current.fetchApiParams = (params2 ?? EMPTY_OBJ) as Memoed<ApiParams<Name>>;
          if (!noReturnState || ref.current.onFetch) {
            update();
          }
          if (successMsg) {
            showToast({ msg: successMsg });
          }
        });

        return data;
      } catch (_err) {
        ref.current.isFetching = false;
        if (_err instanceof Error) {
          const err = _err;
          batchedUpdates(() => {
            stateRef.current.fetching = false;
            stateRef.current.data = null;
            stateRef.current.error = markMemoed(err);
            ref.current.fetchApiParams = (params2 ?? EMPTY_OBJ) as Memoed<ApiParams<Name>>;
            if (!noReturnState || ref.current.onError) {
              update();
            }

            handleErrorResponse({
              caller: 'useDeferredApi',
              name,
              showToastOnError,
              status: err instanceof ApiError ? err.status : null,
              err,
            });
          });
        }
        throw _err;
      }
    },
    [
      name,
      paramsMemo,
      authToken,
      method,
      handleApiEntities,
      handleErrorResponse,
      noReturnState,
      update,
      showToast,
      successMsg,
      showToastOnError,
    ],
  );

  // todo: low/mid remove useEffect and fix potential bugs
  useEffectIfReady(
    () => {
      ref.current.onFetch?.(
        TS.notNull(stateRef.current.data),
        TS.notNull(ref.current.fetchApiParams),
      );
    },
    [stateRef.current.data, ref.current.fetchApiParams],
    !!(ref.current.onFetch && stateRef.current.data && ref.current.fetchApiParams),
  );

  useEffectIfReady(
    () => {
      ref.current.onError?.(TS.notNull(stateRef.current.error));
    },
    [stateRef.current.error],
    !!(ref.current.onError && stateRef.current.error),
  );

  const resetApi = useCallback(
    (cancelFetching = true) => {
      if (cancelFetching) {
        ref.current.numCancelled = ref.current.numFetches;
        ref.current.isFetching = false;
      }
      stateRef.current.fetching = false;
      stateRef.current.data = null;
      stateRef.current.error = null;
      ref.current.fetchApiParams = null;
      update();
    },
    [update],
  );

  useEffect(() => () => {
    if (cancelOnUnmount) {
      ref.current.numCancelled = ref.current.numFetches;
    }
  }, [cancelOnUnmount]);

  if (noReturnState) {
    return {
      fetchApi,
      resetApi,
    };
  }
  return {
    ...stateRef.current,
    fetchApi,
    resetApi,
  };
}

export default useDeferredApi;

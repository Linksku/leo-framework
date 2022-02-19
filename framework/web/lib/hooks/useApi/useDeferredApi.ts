import fetcher from 'lib/fetcher';
import removeUndefinedValues from 'lib/removeUndefinedValues';
import { HTTP_TIMEOUT, API_URL } from 'settings';
import ApiError from 'lib/ApiError';
import useEffectIfReady from 'lib/hooks/useEffectIfReady';
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
  fetchApiParams: Memoed<ApiParams<Name>> | null,
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
  const [state, setState] = useState<State<Name>>({
    data: null,
    fetching: false,
    error: null,
    fetchApiParams: null,
  });
  const ref = useRef({
    isFetching: false,
    numFetches: 0,
    numCancelled: 0,
    onFetch,
    onError,
  });
  ref.current.onFetch = onFetch;
  ref.current.onError = onError;
  const { authToken } = useAuthStore();
  const handleApiEntities = useHandleApiEntities(type !== 'load');
  const handleErrorResponse = useHandleErrorResponse();
  const showToast = useShowToast();

  const fetchApi: FetchApi<Name, Params> = useCallback(
    (params2, files) => {
      if (process.env.NODE_ENV !== 'production' && files
        && !Object.values(files).every(f => {
          if (Array.isArray(f)) {
            return f.every(f2 => f2 instanceof File);
          }
          return f == null || f instanceof File;
        })) {
        throw new Error('fetchApi files aren\'t all files.');
      }

      if (ref.current.isFetching) {
        return Promise.resolve(null);
      }

      ref.current.numFetches++;
      const { numFetches } = ref.current;
      ref.current.isFetching = true;
      if (!noReturnState) {
        setState(s => (s.fetching ? s : ({ ...s, fetching: true })));
      }
      // ObjectOf<
      //   Nullable<ApiParams<Name>>["currentUserId"] | undefined
      // >
      const combinedParams = { ...paramsMemo, ...params2 } as unknown as ApiParams<Name>;

      return fetcher[method](
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
      )
        .then(({ data: response, status }) => {
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
            if (!noReturnState || ref.current.onFetch) {
              setState({
                fetching: false,
                data,
                error: null,
                fetchApiParams: (params2 ?? EMPTY_OBJ) as Memoed<ApiParams<Name>>,
              });
            }
            if (successMsg) {
              showToast({ msg: successMsg });
            }
          });

          return data;
        })
        .catch(err => {
          ref.current.isFetching = false;
          batchedUpdates(() => {
            if (!noReturnState || ref.current.onError) {
              setState({
                fetching: false,
                data: null,
                error: markMemoed(err),
                fetchApiParams: (params2 ?? EMPTY_OBJ) as Memoed<ApiParams<Name>>,
              });
            }

            handleErrorResponse({
              caller: 'useDeferredApi',
              name,
              showToastOnError,
              status: err.status,
              err,
            });
          });
          throw err;
        });
    },
    [
      name,
      paramsMemo,
      authToken,
      method,
      handleApiEntities,
      handleErrorResponse,
      noReturnState,
      showToast,
      successMsg,
      showToastOnError,
    ],
  );

  // todo: low/mid remove useEffect and fix potential bugs
  useEffectIfReady(() => {
    ref.current.onFetch?.(
      TS.notNull(state.data),
      TS.notNull(state.fetchApiParams),
    );
  }, [state.data, state.fetchApiParams], !!(state.data && state.fetchApiParams));

  useEffectIfReady(() => {
    ref.current.onError?.(TS.notNull(state.error));
  }, [state.error], !!state.error);

  const resetApi = useCallback(
    (cancelFetching = true) => {
      if (cancelFetching) {
        ref.current.numCancelled = ref.current.numFetches;
        ref.current.isFetching = false;
      }
      setState(s => (!s.fetching && !s.data && !s.error && !s.fetchApiParams
        ? s
        : {
          fetching: false,
          data: null,
          error: null,
          fetchApiParams: null,
        }));
    },
    [],
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
    ...state,
    fetchApi,
    resetApi,
  };
}

export default useDeferredApi;

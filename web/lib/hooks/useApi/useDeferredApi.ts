import useMountedState from 'react-use/lib/useMountedState';

import fetcher from 'lib/fetcher';
import removeUndefinedValues from 'lib/removeUndefinedValues';
import { HTTP_TIMEOUT, API_URL } from 'settings';
import ApiError from 'lib/ApiError';
import useDynamicCallback from 'lib/hooks/useDynamicCallback';
import useHandleApiEntities from './useHandleApiEntities';
import isErrorResponse from './isErrorResponse';

type Opts<Name extends ApiName> = {
  type?: 'load' | 'create' | 'update' | 'delete',
  method?: 'get' | 'getWithoutCache' | 'post' | 'postForm' | 'patch' | 'put' | 'delete',
  concurrentMode?: 'allowConcurrent' | 'ignoreNext' | 'ignorePrev',
  cancelOnUnmount?: boolean,
  noReturnState?: boolean,
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
  });
  const ref = useRef({
    isFetching: false,
    numFetches: 0,
    numCancelled: 0,
  });
  const { authToken } = useAuthStore();
  const handleApiEntities = useHandleApiEntities<Name>(type !== 'load');
  const showToast = useShowToast();
  const isMounted = useMountedState();

  const onFetchWrap: Memoed<OnApiFetch<Name>> = useDynamicCallback((...args) => {
    if (isMounted()) {
      onFetch?.(...args);
    }
  });

  const onErrorWrap: Memoed<OnApiError> = useDynamicCallback((err: Error) => {
    if (isMounted()) {
      onError?.(err);
    }
  });

  const fetchApi: FetchApi<Name, Params> = useCallback(
    async (params2, files) => {
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
        return null;
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
          params: JSON.stringify(removeUndefinedValues(combinedParams)),
          ...files,
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
            if (!noReturnState) {
              setState({
                fetching: false,
                data,
                error: null,
              });
            }
            onFetchWrap?.(
              successResponse.data,
                (params2 ?? EMPTY_OBJ) as Partial<ApiParams<Name>>,
            );
          });

          return data;
        })
        .catch(err => {
          ref.current.isFetching = false;
          batchedUpdates(() => {
            if (!noReturnState) {
              setState({
                fetching: false,
                data: null,
                error: markMemoed(err),
              });
            }

            if (showToastOnError && err.message) {
              showToast({
                msg: err.message,
              });
            }

            onErrorWrap?.(err);
            ErrorLogger.warning(err, `useDeferredApi: ${name} failed`);
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
      onFetchWrap,
      onErrorWrap,
      noReturnState,
      showToastOnError,
      showToast,
    ],
  );

  const resetApi = useCallback(
    (cancelFetching = true) => {
      if (cancelFetching) {
        ref.current.numCancelled = ref.current.numFetches;
        ref.current.isFetching = false;
      }
      setState(s => (!s.fetching && !s.data && !s.error
        ? s
        : {
          fetching: false,
          data: null,
          error: null,
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

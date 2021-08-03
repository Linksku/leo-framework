import fetcher from 'lib/fetcher';
import promiseTimeout from 'lib/promiseTimeout';
import removeUndefinedValues from 'lib/removeUndefinedValues';
import { HTTP_TIMEOUT, API_URL } from 'settings';
import ApiError from 'lib/ApiError';
import type { OnFetchType, OnErrorType } from './useApiTypes';
import useHandleApiEntities from './useHandleApiEntities';
import isErrorResponse from './isErrorResponse';

type Opts = {
  type?: 'load' | 'create' | 'update' | 'delete',
  method?: 'get' | 'getWithoutCache' | 'post' | 'postForm' | 'patch' | 'put' | 'delete',
  concurrentMode?: 'allowConcurrent' | 'ignoreNext' | 'ignorePrev',
  cancelOnUnmount?: boolean,
  noReturnState?: boolean,
  showToastOnError?: boolean,
};

type OptsCallbacks<Name extends ApiName> = {
  onFetch: OnFetchType<Name>,
  onError: OnErrorType,
};

type State<Name extends ApiName> = {
  data: Memoed<ApiNameToData[Name]> | null,
  fetching: boolean,
  error: Memoed<Error> | null,
};

type FetchApi<
  Name extends ApiName,
  Params extends Partial<ApiNameToParams[Name]>
> = Memoed<(
  params?: Omit<ApiNameToParams[Name], RequiredKeys<Params>>,
  files?: ObjectOf<File | File[]>,
) => Promise<Memoed<ApiNameToData[Name]> | null>>;

type Return<
  Name extends ApiName,
  Params extends Partial<ApiNameToParams[Name]>
> = {
  fetchApi: FetchApi<Name, Params>,
  resetApi: Memoed<(cancelFetching?: boolean) => void>,
};

function useDeferredApi<
  Name extends ApiName,
  Params extends Partial<ApiNameToParams[Name]>
>(
  name: Name,
  params: Params,
  opts: Opts & OptsCallbacks<Name> & {
    noReturnState: true,
  },
): Return<Name, Params>;

function useDeferredApi<
  Name extends ApiName,
  Params extends Partial<ApiNameToParams[Name]>
>(
  name: Name,
  params: Params,
  opts: Opts & { noReturnState: true },
): Return<Name, Params>;

function useDeferredApi<
  Name extends ApiName,
  Params extends Partial<ApiNameToParams[Name]>
>(
  name: Name,
  params?: Params,
  opts?: Opts & OptsCallbacks<Name> & {
    noReturnState?: false,
  },
): Return<Name, Params> & State<Name>;

function useDeferredApi<
  Name extends ApiName,
  Params extends Partial<ApiNameToParams[Name]>
>(
  name: Name,
  params?: Params,
  opts?: Opts & { noReturnState?: false },
): Return<Name, Params> & State<Name>;

function useDeferredApi<
  Name extends ApiName,
  Params extends Partial<ApiNameToParams[Name]>
>(
  name: Name,
  // todo: mid/mid make sure combinedParams matches ApiNameToParams
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
  }: Opts & Partial<OptsCallbacks<Name>> = {},
) {
  useDebugValue(name);

  const method = _method ?? (type === 'load' ? 'get' : 'post');

  const paramsMemo = useDeepMemoObj(params as unknown as Pojo);
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
  const authToken = useAuthToken();
  const handleApiEntities = useHandleApiEntities<Name>(type);
  const showToast = useShowToast();

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
      //   Nullable<ApiNameToParams[Name]>["currentUserId"] | undefined
      // >
      const combinedParams = { ...paramsMemo, ...params2 } as unknown as ApiNameToParams[Name];

      const timeoutErr = new Error(`Fetch(${name}) timed out`);
      timeoutErr.status = 503;
      return promiseTimeout(
        fetcher[method](
          `${API_URL}/api/${name}`,
          {
            params: JSON.stringify(removeUndefinedValues(combinedParams)),
            ...files,
          },
          { authToken },
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

            const successResponse = response as ApiSuccessResponse<Name>;
            const data = markMemoed(successResponse.data);
            batchedUpdates(() => {
              handleApiEntities(successResponse);
              if (!noReturnState) {
                setState({
                  fetching: false,
                  data,
                  error: null,
                });
              }
              onFetch?.(successResponse.data, (params2 ?? {}) as Partial<ApiNameToParams[Name]>);
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

              onError?.(err);
              ErrorLogger.warning(err, `useDeferredApi: ${name} failed`);
            });
            throw err;
          }),
        HTTP_TIMEOUT,
        timeoutErr,
      );
    },
    [
      name,
      paramsMemo,
      authToken,
      method,
      handleApiEntities,
      onFetch,
      onError,
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

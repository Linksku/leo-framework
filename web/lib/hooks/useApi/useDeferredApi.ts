import fetcher from 'lib/fetcher';
import removeFalseyValues from 'lib/removeFalseyValues';
import useHandleApiEntities from './useHandleApiEntities';
import type { OnFetchType, OnErrorType } from './useApiTypes';

type Opts = {
  type?: 'load' | 'create' | 'update' | 'delete',
  method?: 'get' | 'getWithoutCache' | 'post' | 'postForm' | 'patch' | 'put' | 'delete',
  concurrentMode?: 'allowConcurrent' | 'ignoreNext' | 'ignorePrev',
  cancelOnUnmount?: boolean,
  noReturnState?: boolean,
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
  }: Opts & Partial<OptsCallbacks<Name>> = {},
) {
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
      const combinedParams = { ...params, ...params2 } as unknown as ApiNameToParams[Name];

      return fetcher[method](
        `/api/${name}`,
        {
          params: JSON.stringify(removeFalseyValues(combinedParams)),
          ...files,
        },
        { authToken },
      )
        .then((response: Memoed<ApiResponse<Name>>) => {
          ref.current.isFetching = false;
          if (numFetches <= ref.current.numCancelled) {
            // If cache gets updated for cancelled requests, entities also need to be updated.
            return null;
          }

          const data = response.data as Memoed<ApiNameToData[Name]>;
          batchedUpdates(() => {
            handleApiEntities(response);
            if (!noReturnState) {
              setState({
                fetching: false,
                data,
                error: null,
              });
            }
            onFetch?.(response.data, (params2 ?? {}) as Partial<ApiNameToParams[Name]>);
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
            onError?.(err);
          });
          throw err;
        });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      name,
      paramsMemo,
      authToken,
      method,
      type,
      onFetch,
      onError,
      noReturnState,
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

import fetcher from 'core/fetcher';
import removeUndefinedValues from 'utils/removeUndefinedValues';
import { API_URL } from 'settings';
import ApiError from 'core/ApiError';
import useEffectIfReady from 'hooks/useEffectIfReady';
import useUpdate from 'hooks/useUpdate';
import deepFreezeIfDev from 'utils/deepFreezeIfDev';
import useAuthTokenLS from 'hooks/localStorage/useAuthTokenLS';
import useHandleApiEntities from './useHandleApiEntities';
import isErrorResponse from './isErrorResponse';
import useHandleErrorResponse from './useHandleErrorResponse';
import extraApiProps from './extraApiProps';

type Opts<Name extends ApiName> = {
  type?: EntityAction,
  method?: 'get' | 'post' | 'postForm' | 'patch' | 'put' | 'delete',
  concurrentMode?: 'allowConcurrent' | 'ignorePrev' | 'ignoreNext',
  cancelOnUnmount?: boolean,
  returnState?: boolean,
  returnPromise?: boolean,
  successMsg?: string,
  showToastOnError?: boolean,
  onFetch?: (
    results: ApiData<Name>,
    params: ApiParams<Name>,
  ) => void,
  onError?: (
    err: Error,
    params: ApiParams<Name>,
  ) => void,
};

type State<Name extends ApiName> = {
  data: ApiData<Name> | null,
  fetching: boolean,
  error: Stable<Error> | null,
};

export type FetchApiPromise<
  Name extends ApiName,
  Params extends Partial<ApiParams<Name>>,
> = Stable<(
  params: Omit<ApiParams<Name>, RequiredKeys<Params>> & { preventDefault?: never },
  files?: ObjectOf<File | File[]>,
) => Promise<Readonly<ApiData<Name>> | null>>;

export type FetchApiNoPromise<
  Name extends ApiName,
  Params extends Partial<ApiParams<Name>>,
> = Stable<(
  params: Omit<ApiParams<Name>, RequiredKeys<Params>> & { preventDefault?: never },
  files?: ObjectOf<File | File[]>,
) => void>;

function useDeferredApi<
  Name extends ApiName,
  Params extends Name extends any ? Stable<Partial<ApiParams<Name>>> : never,
  Opt extends Opts<Name>,
>(
  name: Name,
  params: Params & (Params extends any
    ? Partial<{
      [K in Exclude<keyof Params, keyof ApiParams<Name>>]: never;
    }>
    : any),
  opts: Opt,
): {
  fetchApi: Opt['returnPromise'] extends true
    ? FetchApiPromise<Name, Params>
    : FetchApiNoPromise<Name, Params>,
  resetApi: Stable<(cancelFetching?: boolean) => void>,
}
  & (Opt['returnState'] extends true ? State<Name> : unknown);

function useDeferredApi<
  Name extends ApiName,
  Params extends Name extends any ? Stable<Partial<ApiParams<Name>>> : never,
>(
  name: Name,
  params: Params & (Params extends any
    ? Partial<{
      [K in Exclude<keyof Params, keyof ApiParams<Name>>]: never;
    }>
    : any),
  opts?: Opts<Name> & { returnState?: false, returnPromise?: false },
): {
  fetchApi: FetchApiNoPromise<Name, Params>,
  resetApi: Stable<(cancelFetching?: boolean) => void>,
};

function useDeferredApi<
  Name extends ApiName,
  Params extends Stable<Partial<ApiParams<Name>>>,
>(
  name: Name,
  params: Params,
  {
    type = 'load',
    method: _method,
    onFetch,
    onError,
    concurrentMode: _concurrentMode,
    cancelOnUnmount = true,
    // Don't call setState.
    returnState = false,
    returnPromise = false,
    successMsg,
    showToastOnError = true,
  }: Opts<Name> = {},
) {
  useDebugValue(name);

  const method = _method ?? (type === 'load' ? 'get' : 'post');
  const concurrentMode = _concurrentMode
    ?? (type === 'update' || type === 'delete' ? 'ignorePrev' : 'allowConcurrent');

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
    fetchApiParams: null as Stable<ApiParams<Name>> | null,
    maybeInUseEffect: false,
  });
  ref.current.onFetch = onFetch;
  ref.current.onError = onError;
  const [authToken] = useAuthTokenLS();
  const handleApiEntities = useHandleApiEntities(type !== 'load');
  const handleErrorResponse = useHandleErrorResponse();
  const showToast = useShowToast();

  const fetchApi: FetchApiPromise<Name, Params> = useCallback(
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

      if ((concurrentMode === 'ignoreNext' || ref.current.maybeInUseEffect)
        && ref.current.isFetching) {
        return null;
      }
      if (!ref.current.maybeInUseEffect) {
        ref.current.maybeInUseEffect = true;
        setTimeout(() => {
          ref.current.maybeInUseEffect = false;
        }, 0);
      }

      if (concurrentMode === 'ignorePrev') {
        ref.current.numCancelled = ref.current.numFetches;
      }

      ref.current.numFetches++;
      const curNumFetches = ref.current.numFetches;
      ref.current.isFetching = true;
      stateRef.current.fetching = true;
      if (returnState) {
        update();
      }

      const combinedParams = {
        ...(params as unknown as ApiParams<Name>),
        ...params2,
      };

      try {
        const { data: _response, status } = await fetcher[method](
          `${API_URL}/api/${name}`,
          {
            ...files,
            params: JSON.stringify(removeUndefinedValues(combinedParams)),
            ...extraApiProps,
          },
          {
            authToken,
            priority: 'high',
          },
        );
        const response = _response as StableDeep<ApiResponse<any>> | undefined;

        ref.current.isFetching = false;
        if (curNumFetches <= ref.current.numCancelled) {
          // If cache gets updated for cancelled requests, entities also need to be updated.
          return null;
        }

        if (!response) {
          throw new ApiError(
            status === 503 || status >= 520
              ? 'Server temporarily unavailable.'
              : 'Unknown error occurred while fetching data.',
            status,
          );
        }
        if (isErrorResponse(response)) {
          throw getErr(
            new ApiError(
              response.error.msg
                || (status === 503 || status >= 520
                  ? 'Server temporarily unavailable.'
                  : 'Unknown error occurred while fetching data.'),
              response.status ?? status,
            ),
            {
              ...response.error.debugCtx,
              ctx: 'useDeferredApi',
              apiName: name,
              status: response.status ?? status,
              ...(response.error.stack && { stack: response.error.stack }),
            },
          );
        }

        const successResponse = response as StableDeep<ApiSuccessResponse<Name>>;
        const { data } = successResponse;
        handleApiEntities(successResponse);
        stateRef.current.fetching = false;
        stateRef.current.data = data;
        stateRef.current.error = null;
        ref.current.fetchApiParams = (params2 ?? EMPTY_OBJ) as Stable<ApiParams<Name>>;
        if (returnState || ref.current.onFetch) {
          update();
        }
        if (successMsg) {
          showToast({ msg: successMsg });
        }

        return deepFreezeIfDev(data);
      } catch (_err) {
        ref.current.isFetching = false;
        if (_err instanceof Error) {
          const err = _err;
          stateRef.current.fetching = false;
          stateRef.current.data = null;
          stateRef.current.error = markStable(err);
          ref.current.fetchApiParams = (params2 ?? EMPTY_OBJ) as Stable<ApiParams<Name>>;
          if (returnState || ref.current.onError) {
            update();
          }

          handleErrorResponse(err, showToastOnError);
        }
        throw _err;
      }
    },
    [
      name,
      params,
      authToken,
      method,
      handleApiEntities,
      handleErrorResponse,
      concurrentMode,
      returnState,
      update,
      showToast,
      successMsg,
      showToastOnError,
    ],
  );

  const fetchApiNoPromise: FetchApiNoPromise<Name, Params> = useCallback(
    (params2, files) => {
      fetchApi(params2, files)
        .catch(err => {
          ErrorLogger.error(err, { apiName: name });
        });
    },
    [name, fetchApi],
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
      ref.current.onError?.(
        TS.notNull(stateRef.current.error),
        TS.notNull(ref.current.fetchApiParams),
      );
    },
    [stateRef.current.error, ref.current.fetchApiParams],
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

  if (!returnState) {
    return {
      fetchApi: returnPromise ? fetchApi : fetchApiNoPromise,
      resetApi,
    };
  }
  return {
    ...stateRef.current,
    fetchApi: returnPromise ? fetchApi : fetchApiNoPromise,
    resetApi,
  };
}

export default useDeferredApi;

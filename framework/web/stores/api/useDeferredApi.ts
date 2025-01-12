import { flushSync } from 'react-dom';

import fetcher from 'core/fetcher';
import removeUndefinedValues from 'utils/removeUndefinedValues';
import { API_URL } from 'consts/server';
import ApiError from 'core/ApiError';
import useUpdate from 'utils/useUpdate';
import deepFreezeIfDev from 'utils/deepFreezeIfDev';
import useAuthTokenStorage from 'core/storage/useAuthTokenStorage';
import useGetIsMounted from 'utils/useGetIsMounted';
import useHandleApiEntities from './useHandleApiEntities';
import isErrorResponse from './isErrorResponse';
import useHandleErrorResponse from './useHandleErrorResponse';
import getExtraApiProps from './getExtraApiProps';

type Opts<Name extends ApiName> = {
  type: EntityAction,
  method?: 'get' | 'post' | 'postForm',
  concurrentMode?: 'allowConcurrent' | 'ignorePrev' | 'ignoreNext',
  returnState?: boolean,
  returnPromise?: boolean,
  successMsg?: string,
  showToastOnError?: boolean,
  onFetch?: (
    results: ApiData<Name>,
    params: ApiParams<Name>,
  ) => void,
  onError?: (
    err: ApiError,
    params: ApiParams<Name>,
  ) => void,
};

type State<Name extends ApiName> = {
  data: ApiData<Name> | null,
  fetching: boolean,
  error: Stable<ApiError> | null,
};

export type FetchApiPromise<
  Name extends ApiName,
  Params extends Partial<ApiParams<Name>>,
> = Stable<(
  params: Omit<ApiParams<Name>, RequiredDefinedKeys<Params>> & { preventDefault?: never },
  files?: ObjectOf<File | File[]>,
) => Promise<Readonly<ApiData<Name>> | null>>;

export type FetchApiNoPromise<
  Name extends ApiName,
  Params extends Partial<ApiParams<Name>>,
> = Stable<(
  params: Omit<ApiParams<Name>, RequiredDefinedKeys<Params>> & { preventDefault?: never },
  files?: ObjectOf<File | File[]>,
) => void>;

export default function useDeferredApi<
  Name extends ApiName,
  Params extends Name extends any ? Stable<Partial<ApiParams<Name>>> : never,
  Opt extends Opts<Name>,
  Ret extends ({
    fetchApi: Opt['returnPromise'] extends true
      ? FetchApiPromise<Name, Params>
      : FetchApiNoPromise<Name, Params>,
    resetApi: Stable<(cancelFetching?: boolean) => void>,
  }
    & (Opt['returnState'] extends true ? State<Name> : unknown)),
>(
  name: Name,
  _params: Params & (Params extends any
    ? Partial<{
      [K in Exclude<keyof Params, keyof ApiParams<Name>>]: never;
    }>
    : never),
  {
    type,
    method: _method,
    onFetch,
    onError,
    concurrentMode: _concurrentMode,
    // Don't call setState.
    returnState = false,
    returnPromise = false,
    successMsg,
    showToastOnError = true,
  }: Opt,
): Ret {
  useDebugValue(name);

  const params = _params as unknown as Stable<ApiParams<Name>>;
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
    fetchApiParams: null as Stable<ApiParams<Name>> | null,
    maybeInUseEffect: false,
  });
  const latestOnFetch = useLatest(onFetch);
  const latestOnError = useLatest(onError);
  const [authToken] = useAuthTokenStorage();
  const handleApiEntities = useHandleApiEntities(type !== 'load');
  const handleErrorResponse = useHandleErrorResponse();
  const getIsMounted = useGetIsMounted();

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
        ...(params as ApiParams<Name>),
        ...params2,
      };

      try {
        const extraApiProps = await getExtraApiProps();
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

        if (!response || isErrorResponse(response)) {
          if (!response) {
            throw new ApiError(
              status === 503 || status >= 520
                ? 'Server temporarily unavailable.'
                : 'Unknown error occurred while fetching data.',
              status,
            );
          }

          throw new ApiError(
            response.error.msg
              || (status === 503 || status >= 520
                ? 'Server temporarily unavailable.'
                : 'Unknown error occurred while fetching data.'),
            {
              status: response.status ?? status,
              code: response.error.code,
              debugCtx: {
                ...response.error.debugCtx,
                ctx: `useDeferredApi(${name})`,
                apiName: name,
                status: response.status ?? status,
                stack: response.error.stack?.join('\n'),
              },
            },
          );
        }

        const successResponse = response as StableDeep<ApiSuccessResponse<Name>>;

        flushSync(() => {
          handleApiEntities(successResponse);

          if (successMsg) {
            showToast({ msg: successMsg });
          }
        });

        // Don't know if it's possible for this to run between rerenders
        // After handleApiEntities in case component calls API to create entity, then unmounts
        if (!getIsMounted()) {
          if (!process.env.PRODUCTION && latestOnFetch.current) {
            ErrorLogger.warn(new Error(`useDeferredApi(${name}): unmounted before onFetch ran`));
          }
          return null;
        }
        stateRef.current.fetching = false;
        stateRef.current.data = successResponse.data;
        stateRef.current.error = null;
        ref.current.fetchApiParams = (params2 ?? EMPTY_OBJ) as Stable<ApiParams<Name>>;

        latestOnFetch.current?.(successResponse.data, TS.notNull(ref.current.fetchApiParams));

        if (returnState) {
          update();
        }

        return deepFreezeIfDev(successResponse.data);
      } catch (err) {
        ref.current.isFetching = false;

        if (err instanceof Error) {
          handleErrorResponse(err, showToastOnError);

          if (!getIsMounted()) {
            throw err;
          }

          stateRef.current.fetching = false;
          stateRef.current.data = null;
          stateRef.current.error = markStable(
            err instanceof ApiError
              ? err
              : new ApiError(err.message, 503),
          );
          ref.current.fetchApiParams = (params2 ?? EMPTY_OBJ) as Stable<ApiParams<Name>>;

          if (latestOnError.current) {
            latestOnError.current(
              stateRef.current.error,
              TS.notNull(ref.current.fetchApiParams),
            );
          }

          if (returnState) {
            update();
          }
        } else {
          ErrorLogger.warn(err, { ctx: `useDeferredApi(${name})` });
        }
        throw err;
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
      getIsMounted,
      returnState,
      update,
      successMsg,
      showToastOnError,
      latestOnFetch,
      latestOnError,
    ],
  );

  const fetchApiNoPromise: FetchApiNoPromise<Name, Params> = useCallback(
    (params2, files) => {
      fetchApi(params2, files)
        // Handled in handleErrorResponse
        .catch(NOOP);
    },
    [fetchApi],
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

  const methods = {
    fetchApi: returnPromise ? fetchApi : fetchApiNoPromise,
    resetApi,
  };
  if (!returnState) {
    return methods as Ret;
  }
  return {
    ...stateRef.current,
    ...methods,
  } as unknown as Ret;
}

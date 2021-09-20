import fetcher from 'lib/fetcher';
import ApiError from 'lib/ApiError';
import { HTTP_TIMEOUT, API_URL } from 'settings';
import type useHandleApiEntities from './useHandleApiEntities';
import type useHandleErrorResponse from './useHandleErrorResponse';
import isErrorResponse from './isErrorResponse';

interface BatchedRequest<Name extends ApiName> {
  name: Name,
  params: ApiParams<Name>,
  onFetch?: OnApiFetch<Name>,
  onError?: OnApiError,
  succPromise: (results: ApiData<Name>) => void,
  failPromise: (err: Error) => void,
  authToken: string | null,
  handleApiEntities: ReturnType<typeof useHandleApiEntities>,
  handleErrorResponse: ReturnType<typeof useHandleErrorResponse>,
}

let timer: number | null = null;
let batched: BatchedRequest<any>[] = [];

async function fetchBatchedRequest() {
  if (!batched.length) {
    return;
  }

  if ((new Set(batched.map(b => b.authToken))).size > 1) {
    throw new Error('AuthToken changed in batched request.');
  }

  timer = null;
  const curBatched = batched;
  batched = [];
  const { name, params, authToken, handleApiEntities, handleErrorResponse } = curBatched[0];
  try {
    const timeoutErr = new Error(`Fetch(${name}) timed out`);
    timeoutErr.status = 503;
    const { data: fullResponse, status } = curBatched.length === 1
      ? await fetcher.get(
        `${API_URL}/api/${name}`,
        {
          params: JSON.stringify(params),
          ver: process.env.JS_VERSION,
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
            apis: curBatched.map(b => ({
              name: b.name,
              params: b.params,
            })),
          }),
          ver: process.env.JS_VERSION,
        },
        {
          authToken,
          timeout: HTTP_TIMEOUT,
        },
      );

    if (isErrorResponse(fullResponse)) {
      throw new ApiError('batched', fullResponse?.status ?? status, fullResponse?.error);
    }

    const results: MemoDeep<ApiResponse<any>>[] = curBatched.length === 1
      ? markMemoed([fullResponse])
      : (fullResponse as MemoDeep<ApiSuccessResponse<'batched'>>).data.results;

    if (results.length !== curBatched.length) {
      throw new Error('Batched API response has wrong length.');
    }

    batchedUpdates(() => {
      handleApiEntities(fullResponse);
      for (const [idx, result] of results.entries()) {
        if (isErrorResponse(result)) {
          const err = new ApiError(
            curBatched[idx].name,
            result.status ?? status,
            result.error,
          );

          handleErrorResponse({
            caller: 'queueBatchedRequest',
            name: curBatched[idx].name,
            status: err.status,
            err,
          });

          curBatched[idx].onError?.(err);
          curBatched[idx].failPromise(err);
        } else {
          curBatched[idx].onFetch?.(result.data, curBatched[idx].params);
          curBatched[idx].succPromise(result.data);
        }
      }
    });
  } catch (err) {
    handleErrorResponse({
      caller: 'queueBatchedRequest',
      name: curBatched.map(v => v.name).join(','),
      status: err.status,
      err,
    });

    batchedUpdates(() => {
      for (const b of curBatched) {
        b.onError?.(err);
        b.failPromise(err);
      }
    });
  }
}

export default async function queueBatchedRequest<Name extends ApiName>({
  name,
  params,
  onFetch,
  onError,
  authToken,
  handleApiEntities,
  handleErrorResponse,
}: {
  name: Name,
  params: ApiParams<Name>,
  onFetch?: OnApiFetch<Name>,
  onError?: OnApiError,
  authToken: string | null,
  handleApiEntities: ReturnType<typeof useHandleApiEntities>,
  handleErrorResponse: ReturnType<typeof useHandleErrorResponse>,
}): Promise<ApiData<Name>> {
  if (!timer) {
    setTimeout(fetchBatchedRequest, 0);
  }
  // todo: mid/mid add cache for batched requests
  return new Promise<ApiData<Name>>((succ, fail) => {
    batched.push({
      name,
      params,
      onFetch,
      onError,
      succPromise: succ,
      failPromise: fail,
      authToken,
      handleApiEntities,
      handleErrorResponse,
    });
  });
}

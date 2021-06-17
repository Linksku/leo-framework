import fetcher, { getErrorFromApiData } from 'lib/fetcher';
import type { OnFetchType, OnErrorType } from './useApiTypes';

interface BatchedRequest<Name extends ApiName> {
  name: Name,
  params: ApiNameToParams[Name],
  onFetch?: OnFetchType<Name>,
  onError?: OnErrorType,
  succPromise: (results: Memoed<ApiNameToData[Name]>) => void,
  failPromise: (err: Error) => void,
  authToken: string | null,
  handleApiEntities: Memoed<(response: ApiResponse<Name>) => void>,
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
  try {
    const { name, params, authToken, handleApiEntities } = curBatched[0];
    let response: ApiResponse<any>;
    let results: {
      status: number,
      data: ApiNameToData[ApiName],
      error?: any,
    }[];
    if (curBatched.length === 1) {
      response = await fetcher.get(
        `/api/${name}`,
        {
          params: JSON.stringify(params),
        },
        { authToken },
      );
      results = [{
        status: 200,
        data: response.data,
      }];
    } else {
      response = await fetcher.get(
        '/api/batched',
        {
          params: JSON.stringify({
            apis: curBatched.map(b => ({
              name: b.name,
              params: b.params,
            })),
          }),
        },
        { authToken },
      );
      ({ results } = response.data);
    }

    if (results.length !== curBatched.length) {
      throw new Error('Batched API response has wrong length.');
    }
    // todo: low/mid simplify queueBatchedRequest
    batchedUpdates(() => {
      handleApiEntities(response);
      for (const [idx, result] of results.entries()) {
        if (result.status !== 200 || result.error) {
          curBatched[idx].onError?.(getErrorFromApiData(result));
        } else {
          curBatched[idx].onFetch?.(result.data, {});
        }
      }
    });

    for (const [idx, result] of results.entries()) {
      if (result.status !== 200 || result.error) {
        curBatched[idx].failPromise(getErrorFromApiData(result));
      } else {
        curBatched[idx].succPromise(result.data);
      }
    }
  } catch (err) {
    console.error(err);

    batchedUpdates(() => {
      for (const b of curBatched) {
        b.onError?.(err);
      }
    });

    for (const b of curBatched) {
      b.failPromise(err);
    }
  }
}

export default async function queueBatchedRequest<Name extends ApiName>({
  name,
  params,
  onFetch,
  onError,
  authToken,
  handleApiEntities,
}: {
  name: Name,
  params: ApiNameToParams[Name],
  onFetch?: OnFetchType<Name>,
  onError?: OnErrorType,
  authToken: string | null,
  handleApiEntities: Memoed<(response: ApiResponse<Name>) => void>,
}): Promise<Memoed<ApiNameToData[Name]>> {
  if (!timer) {
    setTimeout(fetchBatchedRequest, 0);
  }
  return new Promise<Memoed<ApiNameToData[Name]>>((succ, fail) => {
    batched.push({
      name,
      params,
      onFetch,
      onError,
      succPromise: succ,
      failPromise: fail,
      authToken,
      handleApiEntities,
    });
  });
}

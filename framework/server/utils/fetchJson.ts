import promiseTimeout from 'utils/promiseTimeout';
import deepFreezeIfDev from 'utils/deepFreezeIfDev';
import safeParseJson from 'utils/safeParseJson';
import stringifyUrlQuery from 'utils/stringifyUrlQuery';
import ApiError from 'core/ApiError';

export default async function fetchJson(
  url: string,
  {
    method = 'GET',
    params = null,
    timeout = 15 * 1000,
    headers = Object.create(null),
  }: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE',
    params?: ObjectOf<any> | null,
    timeout?: number,
    headers?: Record<string, string>,
  } = {},
): Promise<{
  data?: unknown,
  status: number,
}> {
  const opts: RequestInit = {
    method,
    headers,
  };

  if (method === 'GET' && params) {
    url += (url.includes('?') ? '&' : '?') + stringifyUrlQuery(params);
  }

  if (method !== 'GET') {
    headers['content-type'] = 'application/json';
    opts.body = JSON.stringify(params);
  }

  const res: Response = await promiseTimeout(
    fetch(url, opts),
    timeout,
    new ApiError(`fetchJson(${url}): timed out`, 503),
  );
  if (res.status === 204) {
    return {
      status: 204,
    };
  }

  const text = await res.text();
  const data = safeParseJson(text);
  if (data === undefined) {
    throw new ApiError(
      `fetchJson(${url}): unable to parse JSON`,
      res.status,
      { text: text.slice(0, 100) },
    );
  }

  return {
    data: deepFreezeIfDev(data),
    status: res.status,
  };
}

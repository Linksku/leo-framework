import { URLSearchParams } from 'url';
import promiseTimeout from 'utils/promiseTimeout';
import { MAX_HTTP_TIMEOUT } from 'settings';

export default async function fetchJson(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  params: Nullish<ObjectOf<any>> = null,
): Promise<{
  data?: unknown,
  status: number,
}> {
  const headers: HeadersInit = {};
  const opts: RequestInit = {
    method,
    headers,
  };

  if (method === 'GET' && params) {
    const qs = new URLSearchParams(params);
    url += `${url.includes('?') ? '&' : '?'}${qs.toString()}`;
  }

  if (method !== 'GET') {
    headers['content-type'] = 'application/json';
    opts.body = JSON.stringify(params);
  }

  const res: Response = await promiseTimeout(
    fetch(url, opts),
    MAX_HTTP_TIMEOUT,
    new Error(`fetchJson(${url}) timed out`),
  );
  if (res.status === 204) {
    return {
      status: 204,
    };
  }

  let data: any = null;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    const err = new Error(`fetchJson(${url}): unable to parse JSON`);
    ErrorLogger.warn(err, text.slice(0, 200));
    throw err;
  }

  return {
    data,
    status: res.status,
  };
}

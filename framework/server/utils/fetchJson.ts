import type { HeadersInit, RequestInit, Response } from 'undici';

import { URLSearchParams } from 'url';
import promiseTimeout from 'utils/promiseTimeout';
import deepFreezeIfDev from 'utils/deepFreezeIfDev';
import safeParseJson from 'utils/safeParseJson';

export default async function fetchJson(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  params: Nullish<ObjectOf<any>> = null,
  timeout = 15 * 1000,
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
    timeout,
    new Error(`fetchJson(${url}): timed out`),
  );
  if (res.status === 204) {
    return {
      status: 204,
    };
  }

  const text = await res.text();
  const data = safeParseJson(text);
  if (data === undefined) {
    throw getErr(`fetchJson(${url}): unable to parse JSON`, { text });
  }

  return {
    data: deepFreezeIfDev(data),
    status: res.status,
  };
}

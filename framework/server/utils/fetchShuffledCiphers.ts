import tls from 'tls';
import { URL } from 'url';
import undici from 'undici';
import shuffle from 'lodash/shuffle.js';

import promiseTimeout from 'utils/promiseTimeout';
import stringifyUrlQuery from 'utils/stringifyUrlQuery';
import ApiError from 'core/ApiError';

export default async function fetchShuffledCiphers(
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
  text?: string,
  status: number,
}> {
  const opts: Parameters<typeof undici.request>[1] = {
    method,
    headers,
  };

  if (method === 'GET') {
    if (params) {
      url += (url.includes('?') ? '&' : '?') + stringifyUrlQuery(params);
    }
  } else if (params) {
    opts.body = JSON.stringify(params);
  }

  const defaultCiphers = tls.DEFAULT_CIPHERS.split(':');
  const shuffledCiphers = [
    ...shuffle(defaultCiphers.slice(0, 3)),
    ...shuffle(defaultCiphers.slice(3)),
  ];
  opts.dispatcher = new undici.Client(new URL(url).origin, {
    connect: undici.buildConnector({
      ciphers: shuffledCiphers.join(':'),
    }),
  });

  return promiseTimeout(
    (async () => {
      const res = await undici.request(url, opts);

      if (res.statusCode === 204) {
        return {
          status: 204,
        };
      }

      const text = await res.body.text();
      return {
        text,
        status: res.statusCode,
      };
    })(),
    {
      timeout,
      getErr: () => new ApiError(`fetchShuffledCiphers(${url}): timed out`, 503),
    },
  );
}

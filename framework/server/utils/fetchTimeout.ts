import promiseTimeout from 'utils/promiseTimeout';
import stringifyUrlQuery from 'utils/stringifyUrlQuery';
import ApiError from 'core/ApiError';
import randInt from 'utils/randInt';

export function getChromeHeaders(): Record<string, string> {
  // Don't know if this actually matters for Reddit scraping
  const version = randInt(100, 124);
  const fullVersion = `${version}.0.${Math.floor(Math.random() * 1000)}.${Math.floor(Math.random() * 1000)}`;
  return {
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'accept-language': 'en-US,en;q=0.9',
    priority: 'u=0, i',
    'sec-ch-prefers-color-scheme': 'light',
    'sec-ch-ua': `"Google Chrome";v="${version}", "Not:A-Brand";v="8", "Chromium";v="${version}"`,
    'sec-ch-ua-full-version-list': `"Google Chrome";v="${fullVersion}", "Not:A-Brand";v="8.0.0.0", "Chromium";v="${fullVersion}"`,
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-model': '""',
    'sec-ch-ua-platform': '"Windows"',
    'sec-ch-ua-platform-version': '"15.0.0"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate', // Undici sets this to 'cors'
    'sec-fetch-site': 'none',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1',
    'user-agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.0.0 Safari/537.36`,
  };
}

export default async function fetchTimeout(
  url: string,
  {
    method = 'GET',
    formData,
    params = null,
    timeout = 15 * 1000,
    headers = Object.create(null),
  }: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE',
    formData?: boolean,
    params?: ObjectOf<any> | null,
    timeout?: number,
    headers?: Record<string, string>,
  } = {},
): Promise<{
  text?: string,
  status: number,
}> {
  const opts: RequestInit = {
    method,
    headers,
  };

  if (method === 'GET') {
    if (params) {
      url += (url.includes('?') ? '&' : '?') + stringifyUrlQuery(params);
    }
  } else if (params) {
    opts.body = formData
      ? new URLSearchParams(params)
      : JSON.stringify(params);
  }

  return promiseTimeout(
    (async () => {
      const res = await fetch(url, opts);

      if (res.status === 204) {
        return {
          status: 204,
        };
      }

      const text = await res.text();
      return {
        text,
        status: res.status,
      };
    })(),
    {
      timeout,
      getErr: () => new ApiError(`fetchTimeout(${url}): timed out`, 503),
    },
  );
}

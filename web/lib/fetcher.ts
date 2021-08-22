import removeUndefinedValues from 'lib/removeUndefinedValues';
import promiseTimeout from 'lib/promiseTimeout';
import { MAX_HTTP_TIMEOUT } from 'settings';

type FetcherOpts = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  authToken?: string | null,
  contentType?: string,
  cache?: RequestCache,
  redirect?: RequestRedirect,
  timeout?: number,
};

async function _fetcher(
  url: string,
  method: string,
  body = null as BodyInit | null,
  {
    authToken = null as string | null,
    contentType = 'application/json',
    cache = 'default' as RequestCache,
    redirect = 'error' as RequestRedirect,
  }: FetcherOpts = {},
): Promise<{
  data?: any,
  status: number,
}> {
  const headers: HeadersInit = {};
  const request: RequestInit = {
    method,
    cache,
    redirect,
    body: null as BodyInit | null,
    credentials: 'include',
  };

  if (body) {
    if (contentType === 'multipart/form-data') {
      // Let fetch add automatically.
    } else if (contentType) {
      headers['content-type'] = contentType;
    }
    request.body = body;
  }

  if (process.env.NODE_ENV !== 'production' && authToken === null) {
    authToken = window.localStorage.getItem('authToken');
  }
  if (authToken !== null) {
    headers.authorization = authToken;
  }
  request.headers = removeUndefinedValues(headers);

  let res: Response;
  try {
    res = await fetch(url, request);
  } catch {
    return {
      status: 503,
    };
  }
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
    ErrorLogger.warning(new Error('fetcher: unable to parse JSON'), text.slice(0, 200));
  }

  return {
    data,
    status: res.status,
  };
}

function _fetcherWrap(
  url: string,
  method: string,
  body = null as BodyInit | null,
  opts: FetcherOpts = {},
) {
  const timeoutErr = new Error(`Fetch(${url}) timed out`);
  timeoutErr.status = 503;
  return promiseTimeout(
    _fetcher(
      url,
      method,
      body,
      opts,
    ),
    opts.timeout ?? MAX_HTTP_TIMEOUT,
    timeoutErr,
  );
}

function _createFullUrl(url: string, params: ObjectOf<string | number | boolean>) {
  const newParams = removeUndefinedValues(params);
  if (!Object.keys(newParams).length) {
    return url;
  }

  let newUrl = `${url}?`;
  for (const k of Object.keys(newParams)) {
    newUrl += `${encodeURIComponent(k)}=${encodeURIComponent(newParams[k])}&`;
  }
  return newUrl.slice(0, -1);
}

const fetcher = {
  async get(
    url: string,
    params: ObjectOf<string | number | boolean> = {},
    opts: FetcherOpts = {},
  ) {
    const fullUrl = _createFullUrl(url, params);
    return _fetcherWrap(fullUrl, opts.method || 'GET', null, opts);
  },

  async getWithoutCache(
    url: string,
    params: ObjectOf<string | number | boolean> = {},
    opts: FetcherOpts = {},
  ) {
    const fullUrl = _createFullUrl(url, params);

    return _fetcherWrap(fullUrl, opts.method || 'GET', null, {
      cache: 'no-cache',
      ...opts,
    });
  },

  async post(url: string, _body: ObjectOf<any> = {}, opts: FetcherOpts = {}) {
    const body = Object.keys(_body).length ? JSON.stringify(_body) : '';
    return _fetcherWrap(url, opts.method || 'POST', body, opts);
  },

  async postForm(url: string, body: ObjectOf<any> = {}, opts: FetcherOpts = {}) {
    opts.contentType = 'multipart/form-data';
    const formData = new FormData();
    for (const key of Object.keys(body)) {
      if (Array.isArray(body[key])) {
        for (const v of body[key]) {
          formData.append(key, v);
        }
      } else {
        formData.append(key, body[key]);
      }
    }

    return _fetcherWrap(url, opts.method || 'POST', formData, opts);
  },

  async patch(url: string, body: ObjectOf<any> = {}, opts: FetcherOpts = {}) {
    return fetcher.post(url, body, { method: 'PATCH', ...opts });
  },

  async put(url: string, body: ObjectOf<any> = {}, opts: FetcherOpts = {}) {
    return fetcher.post(url, body, { method: 'PUT', ...opts });
  },

  async delete(url: string, body: ObjectOf<any> = {}, opts: FetcherOpts = {}) {
    return fetcher.post(url, body, { method: 'DELETE', ...opts });
  },
};

export default fetcher;

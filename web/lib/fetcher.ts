import removeFalseyValues from 'lib/removeFalseyValues';

export function getErrorFromApiData(data: ObjectOf<any> | undefined, status?: number): Error {
  const err = new Error(
    data?.error?.msg
      || (typeof data === 'object' && JSON.stringify(data))
      || 'Unknown error occurred while fetching data.',
  );
  err.title = data?.error?.title;
  err.status = status ?? data?.error?.status ?? 503;
  if (data?.error?.stack) {
    err.stack = data.error.stack;
  }
  return err;
}

type FetcherOpts = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  authToken?: string | null,
  contentType?: string,
  cache?: RequestCache,
  redirect?: RequestRedirect,
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
) {
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
  request.headers = removeFalseyValues(headers);

  let res: Response;
  try {
    res = await fetch(url, request);
  } catch (err) {
    err.status = 503;
    throw err;
  }
  if (res.status === 204) {
    return null;
  }

  let data: any;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    ErrorLogger.warning(new Error('fetcher: unable to parse JSON'), text.slice(0, 200));
  }

  if (!res.ok || !data || data.error) {
    const err = getErrorFromApiData(data, res.status);
    throw err;
  }

  return data;
}

function _createFullUrl(url: string, params: ObjectOf<string | number | boolean>) {
  const newParams = removeFalseyValues(params);
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
    return _fetcher(fullUrl, opts.method || 'GET', null, opts);
  },

  async getWithoutCache(
    url: string,
    params: ObjectOf<string | number | boolean> = {},
    opts: FetcherOpts = {},
  ) {
    const fullUrl = _createFullUrl(url, params);

    return _fetcher(fullUrl, opts.method || 'GET', null, {
      cache: 'no-cache',
      ...opts,
    });
  },

  async post(url: string, _body: ObjectOf<any> = {}, opts: FetcherOpts = {}) {
    const body = Object.keys(_body).length ? JSON.stringify(_body) : '';
    return _fetcher(url, opts.method || 'POST', body, opts);
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

    return _fetcher(url, opts.method || 'POST', formData, opts);
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

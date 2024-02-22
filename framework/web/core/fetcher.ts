import removeUndefinedValues from 'utils/removeUndefinedValues';
import promiseTimeout from 'utils/promiseTimeout';
import { API_TIMEOUT, API_POST_TIMEOUT } from 'consts/server';
import TimeoutError from 'core/TimeoutError';
import safeParseJson from 'utils/safeParseJson';
import getUrlParams from 'utils/getUrlParams';
import isDebug from 'utils/isDebug';

type FetcherOpts = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  authToken?: string | null,
  contentType?: string,
  cache?: RequestCache,
  redirect?: RequestRedirect,
  priority?: RequestInit['priority'],
  timeout?: number,
};

function _createFullUrl(url: string, params: ObjectOf<string | number | boolean> = {}) {
  params = {
    ...params,
    DEBUG: isDebug || !!getUrlParams().get('debug') || undefined,
  };
  const newParams = removeUndefinedValues(params);
  if (!Object.keys(newParams).length) {
    return url;
  }

  let newUrl = url + (url.includes('?') ? '&' : '?');
  for (const k of Object.keys(newParams)) {
    newUrl += `${encodeURIComponent(k)}=${encodeURIComponent(newParams[k])}&`;
  }
  return newUrl.slice(0, -1);
}

async function _getResponse(
  url: string,
  method: string,
  body = null as BodyInit | null,
  {
    authToken = null as string | null,
    contentType = 'application/json',
    cache = 'default' as RequestCache,
    redirect = 'error' as RequestRedirect,
    priority,
  }: FetcherOpts = {},
): Promise<{
  res?: Response,
  status: number,
}> {
  const headers: HeadersInit = Object.create(null);
  const request: RequestInit = {
    method,
    cache,
    redirect,
    body: null as BodyInit | null,
    credentials: 'include',
    priority,
  };

  if (body) {
    if (contentType === 'multipart/form-data') {
      // Let fetch add automatically.
    } else if (contentType) {
      headers['content-type'] = contentType;
    }
    request.body = body;
  }

  if (!process.env.PRODUCTION && authToken === null) {
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
  return {
    res,
    status: res.status,
  };
}

function _fetchJson(
  url: string,
  method: string,
  body = null as BodyInit | null,
  opts: FetcherOpts = {},
) {
  const timeoutErr = new TimeoutError(
    !process.env.PRODUCTION
      ? `Fetch(${url}) timed out`
      : 'Request timed out',
  );
  return promiseTimeout<Promise<{
    data?: JsonPrimitive | ObjectOf<any> | any[] | undefined,
    status: number,
  }>>(
    (async () => {
      const { res, status } = await _getResponse(url, method, body, opts);
      if (!res) {
        return { status };
      }

      const text = await res.text();
      const data = safeParseJson(text);
      if (data === undefined) {
        const err = getErr('fetcher: unable to parse JSON', {
          url,
          text: text.slice(0, 200),
        });
        ErrorLogger.warn(err);
        throw err;
      }

      return {
        data,
        status,
      };
    })(),
    opts.timeout
      // Allow for a bit of transport time
      ?? ((method === 'GET' ? API_TIMEOUT : API_POST_TIMEOUT) + 1000),
    timeoutErr,
  );
}

const fetcher = {
  get(
    url: string,
    params: ObjectOf<string | number | boolean> = {},
    opts: FetcherOpts = {},
  ) {
    return _fetchJson(
      _createFullUrl(url, params),
      opts.method || 'GET',
      null,
      opts,
    );
  },

  async getResponse(
    url: string,
    params: ObjectOf<string | number | boolean> = {},
    opts: FetcherOpts = {},
  ) {
    const { res, status } = await _getResponse(
      _createFullUrl(url, params),
      opts.method || 'GET',
      null,
      opts,
    );
    if (!res) {
      return { status };
    }
    return {
      res,
      status,
    };
  },

  post(url: string, _body: ObjectOf<any> = {}, opts: FetcherOpts = {}) {
    const body = Object.keys(_body).length ? JSON.stringify(_body) : '';
    return _fetchJson(_createFullUrl(url), opts.method || 'POST', body, opts);
  },

  postForm(url: string, body: ObjectOf<any> = {}, opts: FetcherOpts = {}) {
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

    return _fetchJson(
      _createFullUrl(url),
      opts.method || 'POST',
      formData,
      opts,
    );
  },

  patch(url: string, body: ObjectOf<any> = {}, opts: FetcherOpts = {}) {
    return fetcher.post(
      _createFullUrl(url),
      body,
      { method: 'PATCH', ...opts },
    );
  },

  put(url: string, body: ObjectOf<any> = {}, opts: FetcherOpts = {}) {
    return fetcher.post(
      _createFullUrl(url),
      body,
      { method: 'PUT', ...opts },
    );
  },

  delete(url: string, body: ObjectOf<any> = {}, opts: FetcherOpts = {}) {
    return fetcher.post(
      _createFullUrl(url),
      body,
      { method: 'DELETE', ...opts },
    );
  },
};

export default fetcher;

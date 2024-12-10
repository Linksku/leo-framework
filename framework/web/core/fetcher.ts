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
  headers?: ObjectOf<string>,
  contentType?: string,
  cache?: RequestCache,
  redirect?: RequestRedirect,
  priority?: RequestInit['priority'],
  timeout?: number,
};

type FetchJsonResponse = {
  data?: JsonPrimitive | ObjectOf<any> | any[] | undefined,
  status: number,
};

function _createFullUrl(url: string, params: ObjectOf<string | number> = {}) {
  params = {
    ...params,
    DEBUG: isDebug || !!getUrlParams().get('debug') ? 1 : undefined,
  };
  const newParams = removeUndefinedValues(params);
  if (!Object.keys(newParams).length) {
    return url;
  }

  const searchParams = new URLSearchParams(
    // @ts-expect-error URLSearchParams can accept numbers
    newParams,
  );
  return `${url}${url.includes('?') ? '&' : '?'}${searchParams.toString()}`;
}

async function _getResponse(
  url: string,
  method: string,
  body?: BodyInit,
  {
    authToken = null as string | null,
    headers: additionalHeaders,
    contentType = 'application/json',
    cache = 'default' as RequestCache,
    redirect = 'error' as RequestRedirect,
    priority,
  }: FetcherOpts = {},
): Promise<{
  res?: Response,
  status: number,
}> {
  const headers: HeadersInit = additionalHeaders
    ? { ...additionalHeaders }
    : Object.create(null);
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
  body?: BodyInit,
  opts: FetcherOpts = {},
): Promise<FetchJsonResponse> {
  return promiseTimeout<Promise<FetchJsonResponse>>(
    (async () => {
      const { res, status } = await _getResponse(url, method, body, opts);
      if (!res) {
        return { status };
      }

      const text = await res.text();
      const data = safeParseJson(text);
      if (data === undefined) {
        throw getErr('fetcher: unable to parse JSON', {
          url,
          text: text.slice(0, 200),
        });
      }

      return {
        data,
        status,
      };
    })(),
    {
      timeout: opts.timeout
        // Allow for a bit of transport time
        ?? ((method === 'GET' ? API_TIMEOUT : API_POST_TIMEOUT) + 1000),
      getErr: () => new TimeoutError(
        !process.env.PRODUCTION
          ? `Fetch(${url}) timed out`
          : 'Request timed out',
      ),
    },
  );
}

const fetcher = {
  get(
    url: string,
    params: ObjectOf<string | number> = {},
    opts: FetcherOpts = {},
  ): Promise<FetchJsonResponse> {
    return _fetchJson(
      _createFullUrl(url, params),
      opts.method || 'GET',
      undefined,
      opts,
    );
  },

  async getResponse(
    url: string,
    params: ObjectOf<string | number> = {},
    opts: FetcherOpts = {},
  ): Promise<{
    res?: Response,
    status: number,
  }> {
    const { res, status } = await _getResponse(
      _createFullUrl(url, params),
      opts.method || 'GET',
      undefined,
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

  post(
    url: string,
    _body: ObjectOf<any> = {},
    opts: FetcherOpts = {},
  ): Promise<FetchJsonResponse> {
    const body = Object.keys(_body).length ? JSON.stringify(_body) : '';
    return _fetchJson(_createFullUrl(url), opts.method || 'POST', body, opts);
  },

  postForm(
    url: string,
    body: ObjectOf<any> = {},
    opts: FetcherOpts = {},
  ): Promise<FetchJsonResponse> {
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
};

export default fetcher;

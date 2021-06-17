import removeFalseyValues from 'lib/removeFalseyValues';
import promiseTimeout from 'lib/promiseTimeout';
import { HOME_URL, HTTP_TIMEOUT } from 'settings';

export function getErrorFromApiData(data: ObjectOf<any> | undefined): Error {
  const err = new Error(
    data?.error?.msg
      || data?.error
      || (typeof data === 'object' && JSON.stringify(data))
      || data
      || 'Unknown error occurred while fetching data.',
  );
  err.title = data?.error?.title;
  err.status = data?.error?.status ?? 503;
  if (data?.error?.stack) {
    err.stack = data.error?.stack;
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
  path: string,
  method: string,
  body = null as BodyInit | null,
  {
    authToken = null as string | null,
    contentType = 'application/json',
    cache = 'default' as RequestCache,
    redirect = 'error' as RequestRedirect,
  }: FetcherOpts = {},
) {
  const request = {
    method,
    cache,
    redirect,
    headers: {} as ObjectOf<string>,
    body: null as BodyInit | null,
  };

  if (body) {
    if (contentType === 'multipart/form-data') {
      // Let fetch add automatically.
    } else if (contentType) {
      request.headers['content-type'] = contentType;
    }
    request.body = body;
  }

  if (process.env.NODE_ENV !== 'production' && authToken === null) {
    authToken = window.localStorage.getItem('authToken');
  }
  if (authToken !== null) {
    request.headers.authorization = authToken;
  }
  request.headers = removeFalseyValues(request.headers);

  // Using Promises is half the size of async/await.
  const timeoutErr = new Error('Fetch timed out.');
  timeoutErr.status = 503;
  return promiseTimeout(
    fetch(`${HOME_URL}${path}`, request)
      .catch(err => {
        err.status = 503;
        throw err;
      }),
    HTTP_TIMEOUT,
    timeoutErr,
  )
    .then((res: Response) => {
      if (res.status === 204) {
        return null;
      }

      let data: any;
      return res.text()
        .then(text => {
          try {
            data = JSON.parse(text);
          } catch {
            console.error('Unable to parse JSON:', text);
          }

          if (!res.ok || !data || data.error) {
            const err = getErrorFromApiData(data);
            throw err;
          }

          return data;
        });
    });
}

function _createPath(path: string, params: ObjectOf<string | number | boolean>) {
  const newParams = removeFalseyValues(params);
  if (!Object.keys(newParams).length) {
    return path;
  }

  let newPath = `${path}?`;
  for (const k of Object.keys(newParams)) {
    newPath += `${encodeURIComponent(k)}=${encodeURIComponent(newParams[k])}&`;
  }
  return newPath.slice(0, -1);
}

const fetcher = {
  async get(
    path: string,
    params: ObjectOf<string | number | boolean> = {},
    opts: FetcherOpts = {},
  ) {
    const fullPath = _createPath(path, params);
    return _fetcher(fullPath, opts.method || 'GET', null, opts);
  },

  async getWithoutCache(
    path: string,
    params: ObjectOf<string | number | boolean> = {},
    opts: FetcherOpts = {},
  ) {
    const fullPath = _createPath(path, params);

    return _fetcher(fullPath, opts.method || 'GET', null, {
      cache: 'no-cache',
      ...opts,
    });
  },

  async post(path: string, _body: ObjectOf<any> = {}, opts: FetcherOpts = {}) {
    const body = Object.keys(_body).length ? JSON.stringify(_body) : '';
    return _fetcher(path, opts.method || 'POST', body, opts);
  },

  async postForm(path: string, body: ObjectOf<any> = {}, opts: FetcherOpts = {}) {
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

    return _fetcher(path, opts.method || 'POST', formData, opts);
  },

  async patch(path: string, body: ObjectOf<any> = {}, opts: FetcherOpts = {}) {
    return fetcher.post(path, body, { method: 'PATCH', ...opts });
  },

  async put(path: string, body: ObjectOf<any> = {}, opts: FetcherOpts = {}) {
    return fetcher.post(path, body, { method: 'PUT', ...opts });
  },

  async delete(path: string, body: ObjectOf<any> = {}, opts: FetcherOpts = {}) {
    return fetcher.post(path, body, { method: 'DELETE', ...opts });
  },
};

export default fetcher;

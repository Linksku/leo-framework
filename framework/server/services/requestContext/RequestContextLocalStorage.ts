import { AsyncLocalStorage } from 'async_hooks';

import detectOs from 'utils/detectOs';

const DEV_MAX_SIZE = 10_000;

function createCache() {
  let size = 0;
  const cache = Object.create(null) as ObjectOf<any>;

  return {
    set(key: string, value: any) {
      if (process.env.PRODUCTION) {
        cache[key] = value;
      } else if (!Object.prototype.hasOwnProperty.call(cache, key)) {
        if (size === DEV_MAX_SIZE) {
          ErrorLogger.warn(new Error(`RequestContextLocalStorage.cache.set: exceeded ${DEV_MAX_SIZE} values.`));
        }

        cache[key] = value;
        size++;
      } else {
        cache[key] = value;
      }
    },

    get(key: string) {
      return cache[key];
    },

    has(key: string) {
      return key in cache;
    },

    delete(key: string) {
      if (!process.env.PRODUCTION && (key in cache)) {
        size--;
      }
      delete cache[key];
    },

    keys() {
      return Object.keys(cache);
    },
  };
}

export function createRequestContext(req: ExpressRequest): RequestContext {
  const params: ObjectOf<unknown> | undefined = req.method === 'GET'
    ? req.query
    : req.body;
  const apiParams = params?.params;
  const debug = !process.env.PRODUCTION && !!req.query?.DEBUG;
  const profiling = !process.env.PRODUCTION && !!req.query?.PROFILING;

  const userAgent = req.headers['user-agent'];
  const language = req.headers['accept-language']?.split(/,;/)[0].toLowerCase() ?? null;
  return {
    method: req.method,
    path: req.path,
    // Just for logging. Won't be set for apis with file upload.
    apiParams: typeof apiParams === 'object' && apiParams !== null ? apiParams : undefined,
    currentUserId: req.currentUserId ?? null,
    userAgent: userAgent ?? null,
    os: userAgent ? detectOs(userAgent) : null,
    language,
    cache: createCache(),
    debug,
    profiling,
    numDbQueries: 0,
  };
}

// AsyncLocalStorage is maybe 10-20% slower than passing a context object manually.
export default new AsyncLocalStorage<RequestContext>();

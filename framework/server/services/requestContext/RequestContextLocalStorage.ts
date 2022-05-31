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
      } else if (!TS.hasOwnProp(cache, key)) {
        if (size === DEV_MAX_SIZE) {
          ErrorLogger.warn(new Error(`sessionCacheMiddle: session cache has exceeded ${DEV_MAX_SIZE} values.`));
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
  const debug = !process.env.PRODUCTION && !!params?.DEBUG;
  const profiling = !process.env.PRODUCTION && !!params?.PROFILING;

  const userAgent = req.headers['user-agent'];
  return {
    method: req.method,
    path: req.path,
    // Just for logging. Won't be set for apis with file upload.
    apiParams: typeof apiParams === 'object' && apiParams !== null ? apiParams : undefined,
    currentUserId: req.currentUserId ?? null,
    userAgent: userAgent ?? null,
    os: userAgent ? detectOs(userAgent) : null,
    language: req.acceptsLanguages()[0] ?? null,
    cache: createCache(),
    debug,
    profiling,
  };
}

// AsyncLocalStorage is maybe 10-20% slower than passing a context object manually.
export default new AsyncLocalStorage<RequestContext>();

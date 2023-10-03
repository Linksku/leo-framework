import { AsyncLocalStorage } from 'async_hooks';

import detectOs from 'utils/detectOs';

export function createRequestContext(req: ExpressRequest): RequestContext {
  const params: ObjectOf<unknown> | undefined = req.method === 'GET'
    ? req.query
    : req.body;
  const apiParams = params?.params;
  const debug = !process.env.PRODUCTION && !!req.query?.DEBUG;
  const loadTesting = !process.env.PRODUCTION && !!req.query?.LOAD_TESTING;

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
    redisCache: new Map<string, any>(),
    debug,
    loadTesting,
    numDbQueries: 0,
  };
}

// AsyncLocalStorage is maybe 10-20% slower than passing a context object manually.
export default new AsyncLocalStorage<RequestContext>();

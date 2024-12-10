import { AsyncLocalStorage } from 'async_hooks';

import getOSFromUA from 'utils/getOSFromUA';

export const PLATFORM_TYPES = [
  'desktop-web',
  'android-web',
  'android-standalone',
  'android-native',
  'ios-web',
  'ios-standalone',
  'ios-native',
  'other-web',
  'other-standalone',
  'other-native',
] satisfies PlatformType[];

const APP_VERSION_REGEX = /^\d+(?:\.\d+){0,2}$/;

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
    // Internal
    method: req.method,
    apiPath: req.path,
    // Just for logging. Won't be set for apis with file upload.
    apiParams: TS.isObj(apiParams) ? apiParams : undefined,
    referrer: req.headers.referer
      || (Array.isArray(req.headers.referrer) ? req.headers.referrer[0] : req.headers.referrer)
      || null,

    // User Info
    currentUserId: req.currentUserId ?? null,
    userAgent: userAgent ?? null,
    os: userAgent ? getOSFromUA(userAgent) : null,
    platform: typeof params?.platform === 'string'
      && TS.includes(PLATFORM_TYPES, params.platform)
      ? params.platform
      : null,
    appVersion: typeof params?.appVersion === 'string'
      && APP_VERSION_REGEX.test(params.appVersion)
      ? params.appVersion
      : null,
    language,
    ip: req.ip ?? null,

    // Misc
    reqCache: new Map<string, any>(),
    debug,
    loadTesting,
    numDbQueries: 0,
  };
}

// AsyncLocalStorage is maybe 10-20% slower than passing a context object manually.
export default new AsyncLocalStorage<RequestContext>();

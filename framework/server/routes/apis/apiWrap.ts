import { IS_PROFILING_APIS } from 'config';
import { API_ROUTES_HEADERS } from 'consts/httpHeaders';
import randInt from 'utils/randInt';
import deepFreezeIfDev from 'utils/deepFreezeIfDev';
import safeParseJson from 'utils/safeParseJson';
import formatAndLogApiErrorResponse from 'routes/apis/formatAndLogApiErrorResponse';
import validateApiParams from './validateApiParams';
import formatApiHandlerParams from './formatApiHandlerParams';
import validateApiRet from './validateApiRet';
import includeRelatedEntities from './includeRelatedEntities';
import formatApiSuccessResponse from './formatApiSuccessResponse';

const JS_VERSION = Number.parseInt(process.env.JS_VERSION, 10);

function getFullParamsFromReq<Name extends ApiName>(
  api: ApiDefinition<Name>,
  req: ExpressRequest,
): Readonly<ApiParams<Name>> {
  const method = api.config.method ?? 'get';
  if ((method === 'get') !== (req.method === 'GET')) {
    throw new UserFacingError(`Expected ${method.toUpperCase()} request`, 405);
  }

  const paramsObj: ObjectOf<any> = method === 'get'
    ? req.query
    : req.body;

  const ver = TS.parseIntOrNull(paramsObj.ver) ?? 0;
  if (process.env.PRODUCTION && (
    (method === 'get' && ver < JS_VERSION)
      // In case user has already filled out a form
      || (method !== 'get' && ver + 3 < JS_VERSION)
  )) {
    // todo: med/hard don't always throw, e.g. mark APIs as updated
    throw new UserFacingError('Client is outdated.', 469);
  }

  const { params } = paramsObj;
  const parsed = typeof params === 'string'
    ? safeParseJson<any>(params)
    : null;
  const fullParams: ApiParams<Name> = parsed ?? Object.create(null);

  const { files } = req;
  if (api.config.fileFields && files && !Array.isArray(files)) {
    for (const { name, maxCount } of api.config.fileFields) {
      if (TS.hasProp(files, name)) {
        // @ts-expect-error wontfix key error
        fullParams[name] = maxCount === 1
          ? files[name][0]
          : files[name];
      }
    }
  }

  return deepFreezeIfDev(fullParams);
}

// todo: med/hard maybe send ents updated via MZ after request completes
export default function apiWrap<Name extends ApiName>(
  api: ApiDefinition<Name>,
): (req: ExpressRequest, res: ExpressResponse) => Promise<void> {
  return async (req, res) => {
    const startTime = performance.now();
    let result: ApiSuccessResponse<Name> | ApiErrorResponse;
    let status: number;
    try {
      const fullParams = getFullParamsFromReq(api, req);

      const { relations, ..._params } = fullParams;
      const params = _params as ApiNameToParams[Name];
      validateApiParams({
        api,
        reqMethod: req.method,
        params,
        relations,
        currentUserId: req.currentUserId,
      });

      const handlerParams = formatApiHandlerParams({
        userAgent: req.headers['user-agent'],
        api,
        params,
        currentUserId: req.currentUserId,
      });
      let ret: ApiRouteRet<Name> | Promise<ApiRouteRet<Name>>;
      try {
        ret = api.handler(handlerParams);
        if (ret instanceof Promise) {
          ret = await ret;
        }
      } catch (err) {
        throw getErr(err, { ctx: `apiWrap.handler(${api.config.name})` });
      }

      if (performance.now() - startTime > api.config.timeout) {
        throw new UserFacingError('Request timed out', 504);
      }

      validateApiRet({ api, ret });
      if (relations) {
        includeRelatedEntities(ret, relations);
      }

      try {
        result = await formatApiSuccessResponse(api.config.name, ret);
        status = 200;
      } catch (err) {
        throw getErr(err, { ctx: 'formatApiSuccessResponse' });
      }

      if (ret.cookies) {
        for (const [name, val] of TS.objEntries(ret.cookies)) {
          if (val) {
            res.cookie(name, val.val, val.opts);
          } else {
            res.clearCookie(name);
          }
        }
      }
    } catch (err) {
      result = formatAndLogApiErrorResponse(err, 'apiWrap', api.config.name);
      status = result.status;
    }

    if (IS_PROFILING_APIS
      || (!process.env.PRODUCTION && performance.now() - startTime > 100)) {
      // eslint-disable-next-line no-console
      console.log(`apiWrap(${api.config.name}): handler took ${Math.round(performance.now() - startTime)}ms`);
    }

    if (!process.env.PRODUCTION && !IS_PROFILING_APIS && !getRC()?.loadTesting) {
      await pause(randInt(50, 200));
    }

    res.status(status)
      .set(API_ROUTES_HEADERS)
      // todo: low/med switch to fast-json-stringify
      .send(JSON.stringify(
        result,
        null,
        process.env.PRODUCTION ? 0 : 2,
      ));
  };
}

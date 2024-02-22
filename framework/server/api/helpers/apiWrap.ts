import { API_TIMEOUT, API_POST_TIMEOUT } from 'consts/server';
import { IS_PROFILING_API } from 'consts/infra';
import { API_ROUTES_HEADERS } from 'consts/httpHeaders';
import randInt from 'utils/randInt';
import deepFreezeIfDev from 'utils/deepFreezeIfDev';
import safeParseJson from 'utils/safeParseJson';
import validateApiParams from './validateApiParams';
import formatApiHandlerParams from './formatApiHandlerParams';
import validateApiRet from './validateApiRet';
import includeRelatedEntities from './includeRelatedEntities';
import formatApiSuccessResponse from './formatApiSuccessResponse';
import formatAndLogApiErrorResponse from './formatAndLogApiErrorResponse';

function getFullParamsFromReq<Name extends ApiName>(
  api: ApiDefinition<Name>,
  req: ExpressRequest,
): Readonly<ApiParams<Name>> {
  const paramsObj: ObjectOf<any> = req.method === 'GET'
    ? req.query
    : req.body;

  const ver = TS.parseIntOrNull(paramsObj.ver) ?? 0;
  if (process.env.PRODUCTION && ver < Number.parseInt(process.env.JS_VERSION, 10)) {
    // todo: mid/hard don't always throw, e.g. mark APIs as updated
    throw new UserFacingError('Client is outdated.', 469);
  }

  const parsed = typeof paramsObj?.params === 'string'
    ? safeParseJson<any>(paramsObj.params)
    : null;
  const fullParams: ApiParams<Name> = parsed ?? Object.create(null);

  const { files } = req;
  if (api.config.fileFields && files && !Array.isArray(files)) {
    for (const { name, maxCount } of api.config.fileFields) {
      if (TS.hasProp(files, name)) {
        // @ts-ignore wontfix key error
        fullParams[name] = maxCount === 1
          ? files[name][0]
          : files[name];
      }
    }
  }

  return deepFreezeIfDev(fullParams);
}

// todo: mid/hard maybe send ents updated via MZ after request completes
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
        ret = api.handler(handlerParams, res);
        if (ret instanceof Promise) {
          ret = await ret;
        }
      } catch (err) {
        throw getErr(err, { ctx: `handler(${api.config.name})` });
      }

      if (performance.now() - startTime
        > (req.method === 'GET' ? API_TIMEOUT : API_POST_TIMEOUT)) {
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
    } catch (err) {
      result = formatAndLogApiErrorResponse(err, 'apiWrap', api.config.name);
      status = result.status;
    }

    if (IS_PROFILING_API
      || (!process.env.PRODUCTION && performance.now() - startTime > 100)) {
      // eslint-disable-next-line no-console
      console.log(`apiWrap(${api.config.name}): handler took ${Math.round(performance.now() - startTime)}ms`);
    }

    if (!process.env.PRODUCTION && !IS_PROFILING_API && !getRC()?.loadTesting) {
      await pause(randInt(50, 200));
    }

    res.status(status)
      .set(API_ROUTES_HEADERS)
      // todo: low/mid switch to fast-json-stringify
      .send(JSON.stringify(
        result,
        null,
        process.env.PRODUCTION ? 0 : 2,
      ));
  };
}

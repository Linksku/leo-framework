import { API_TIMEOUT, API_POST_TIMEOUT } from 'settings';
import { IS_PROFILING_API } from 'serverSettings';
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
  const paramsObj = req.method === 'GET'
    ? req.query
    : req.body;

  const ver = TS.parseIntOrNull(paramsObj.ver) ?? 0;
  if (process.env.PRODUCTION && ver < Number.parseInt(process.env.JS_VERSION, 10)) {
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
      let ret = api.handler(handlerParams, res);
      if (ret instanceof Promise) {
        ret = await ret;
      }

      if (performance.now() - startTime
        > (req.method === 'GET' ? API_TIMEOUT : API_POST_TIMEOUT)) {
        throw new UserFacingError('Request timed out', 504);
      }

      validateApiRet({ api, ret });
      if (relations) {
        includeRelatedEntities(ret, relations);
      }

      result = await formatApiSuccessResponse<Name>(ret);
      status = 200;
      res = res
        .set(
          'Cache-Control',
          'public,max-age=0',
        );
    } catch (err) {
      result = formatAndLogApiErrorResponse(err, 'apiWrap', api.config.name);
      status = result.status;
    }

    if (!process.env.PRODUCTION) {
      const rc = getRC();

      if (performance.now() - startTime > 100) {
        printDebug(
          `Handler took ${Math.round(performance.now() - startTime)}ms (${rc?.numDbQueries ?? 0} DB requests)`,
          performance.now() - startTime > 500 ? 'error' : 'warn',
          { ctx: `${api.config.name}` },
        );
      }

      if (!IS_PROFILING_API && !rc?.loadTesting) {
        await pause(randInt(50, 200));
      }
    }
    res.status(status)
      .set('Content-Type', 'application/json; charset=utf-8')
      // todo: low/mid switch to fast-json-stringify
      .send(JSON.stringify(
        result,
        null,
        process.env.PRODUCTION ? 0 : 2,
      ));
  };
}

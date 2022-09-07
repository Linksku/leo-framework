import omit from 'lodash/omit';

import { HOME_URL } from 'settings';
import rand from 'utils/rand';
import deepFreezeIfDev from 'utils/deepFreezeIfDev';
import validateApiParams from './validateApiParams';
import formatApiHandlerParams from './formatApiHandlerParams';
import validateApiRet from './validateApiRet';
import includeRelatedEntities from './includeRelatedEntities';
import formatApiSuccessResponse from './formatApiSuccessResponse';
import formatApiErrorResponse from './formatApiErrorResponse';

function getFullParamsFromReq<Name extends ApiName>(
  api: ApiDefinition<Name>,
  req: ExpressRequest,
): ApiParams<Name> {
  const paramsObj = req.method === 'GET'
    ? req.query
    : req.body;

  const ver = TS.parseIntOrNull(paramsObj.ver);
  // todo: low/mid restart webpack watch after creating git commit
  if (process.env.PRODUCTION && ver && ver < Number.parseInt(process.env.JS_VERSION, 10)) {
    throw new UserFacingError('Client is outdated.', 469);
  }

  let fullParams: ApiParams<Name>;
  try {
    fullParams = JSON.parse(paramsObj?.params);
  } catch {
    throw new UserFacingError('Unknown error when handling request.', 400);
  }
  const { files } = req;
  if (api.config.fileFields && files && !Array.isArray(files)) {
    for (const { name, maxCount } of api.config.fileFields) {
      if (TS.hasProp(files, name)) {
        if (maxCount === 1) {
          // @ts-ignore wontfix key error
          fullParams[name] = files[name][0];
        } else {
          // @ts-ignore wontfix key error
          fullParams[name] = files[name];
        }
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

      const { relations } = fullParams;
      const params = omit(fullParams, 'relations') as ApiNameToParams[Name];
      validateApiParams({
        api,
        params,
        relations,
        currentUserId: req.currentUserId,
      });

      const handlerParams = formatApiHandlerParams({
        api,
        params,
        currentUserId: req.currentUserId,
      });
      let ret = api.handler(handlerParams, res);
      if (ret instanceof Promise) {
        ret = await ret;
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
          process.env.PRODUCTION ? 'public,max-age=60' : 'public,max-age=0',
        );
    } catch (err) {
      if (err instanceof UserFacingError) {
        const method = err.status < 500 ? 'warn' : 'error';
        ErrorLogger[method](
          ErrorLogger.castError(err),
          `apiWrap(${api.config.name})${err.debugCtx ? `: ${err.debugCtx}` : ''}`,
        );
      } else if (err instanceof ErrorWithCtx) {
        ErrorLogger.error(
          ErrorLogger.castError(err),
          `apiWrap(${api.config.name})${err.debugCtx ? `: ${err.debugCtx}` : ''}`,
        );
      } else {
        ErrorLogger.error(ErrorLogger.castError(err), `apiWrap(${api.config.name})`);
      }

      result = formatApiErrorResponse(err, api.config.name);
      ({ status } = result);
    }

    if (performance.now() - startTime > 100) {
      printDebug(
        `Handler took ${Math.round(performance.now() - startTime)}ms`,
        performance.now() - startTime > 500 ? 'error' : 'warn',
        `${api.config.name}`,
      );
    }

    if (!process.env.PRODUCTION) {
      await pause(rand(50, 200));
    }

    res.status(status)
      .set('Content-Type', 'application/json; charset=utf-8')
      .set('Access-Control-Allow-Origin', HOME_URL)
      .send(JSON.stringify(
        result,
        null,
        process.env.PRODUCTION ? 0 : 2,
      ));
  };
}

import { API_TIMEOUT } from 'settings';
import { IS_PROFILING_API } from 'serverSettings';
import safeParseJson from 'utils/safeParseJson';
import { nameToApi } from 'services/ApiManager';
import promiseTimeout from 'utils/promiseTimeout';
import randInt from 'utils/randInt';
import formatApiHandlerParams from './helpers/formatApiHandlerParams';
import validateApiParams from './helpers/validateApiParams';
import validateApiRet from './helpers/validateApiRet';
import includeRelatedEntities from './helpers/includeRelatedEntities';
import formatAndLogApiErrorResponse from './helpers/formatAndLogApiErrorResponse';
import formatApiSuccessResponse from './helpers/formatApiSuccessResponse';

export default async function streamApi(req: ExpressRequest, res: ExpressResponse) {
  const { currentUserId, query, headers } = req;
  const ver = TS.parseIntOrNull(query.ver) ?? 0;
  if (process.env.PRODUCTION && ver < Number.parseInt(process.env.JS_VERSION, 10)) {
    throw new UserFacingError('Client is outdated.', 469);
  }

  const apis = typeof query?.apis === 'string'
    ? safeParseJson<{ name: ApiName, params: any }[]>(
      query.apis,
      val => Array.isArray(val)
        && val.every(item => typeof item === 'object' && item.name && item.params),
    )
    : null;
  if (!apis) {
    throw new UserFacingError('Invalid request', 400);
  }

  res.status(200)
    .set('Content-Type', 'text/plain; charset=utf-8')
    .set('Cache-Control', 'public,max-age=0');

  let numCompleted = 0;
  let waitForDrain: Promise<void> | null = null;
  let lastFlushTime = performance.now();
  await Promise.all(apis.map(async <Name extends ApiName>(
    {
      name,
      params: fullParams,
    }: {
      name: Name,
      params: ApiParams<Name>,
    },
    batchIdx: number,
  ) => {
    const startTime = performance.now();
    const api = nameToApi.get(name) as ApiDefinition<Name>;
    let result: ApiSuccessResponse<ApiName> | ApiErrorResponse;
    try {
      const { relations, ..._params } = fullParams;
      const params = _params as ApiNameToParams[Name];
      validateApiParams({
        api,
        params,
        relations,
        currentUserId,
      });

      const handlerParams = formatApiHandlerParams({
        userAgent: headers['user-agent'],
        api,
        params,
        currentUserId,
      });

      let ret = api.handler(handlerParams, res);
      if (ret instanceof Promise) {
        ret = await promiseTimeout(
          ret,
          (API_TIMEOUT * 0.9) - (performance.now() - startTime),
          new UserFacingError('Request timed out', 504),
        );
      }

      if (performance.now() - startTime > API_TIMEOUT) {
        throw new UserFacingError('Request timed out', 504);
      }
      validateApiRet({ api, ret });
      if (relations) {
        includeRelatedEntities(ret, relations);
      }
      result = await formatApiSuccessResponse<Name>(ret);
    } catch (err) {
      result = formatAndLogApiErrorResponse(err, 'streamApi', name);
    }

    if (performance.now() - startTime > API_TIMEOUT) {
      throw new UserFacingError('Request timed out', 504);
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
        await pause(randInt(0, 200));
      }
    }

    if (waitForDrain) {
      await waitForDrain;
    }
    const response = `${JSON.stringify(
      {
        batchIdx,
        result,
      },
      null,
      process.env.PRODUCTION ? 0 : 2,
    )}\f`;
    if (!res.write(response)) {
      waitForDrain = new Promise(succ => {
        res.once('drain', succ);
        waitForDrain = null;
      });
      await waitForDrain;
    }

    numCompleted++;
    if (numCompleted < apis.length
      && performance.now() - lastFlushTime > 100) {
      res.flush();
      lastFlushTime = performance.now();
    }
  }));

  res.end();
}

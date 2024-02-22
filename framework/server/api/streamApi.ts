import { API_TIMEOUT } from 'consts/server';
import { IS_PROFILING_API } from 'consts/infra';
import { STREAM_API_HEADERS } from 'consts/httpHeaders';
import safeParseJson from 'utils/safeParseJson';
import { nameToApi } from 'services/ApiManager';
import promiseTimeout from 'utils/promiseTimeout';
import randInt from 'utils/randInt';
import RequestContextLocalStorage from 'services/requestContext/RequestContextLocalStorage';
import formatApiHandlerParams from './helpers/formatApiHandlerParams';
import validateApiParams from './helpers/validateApiParams';
import validateApiRet from './helpers/validateApiRet';
import includeRelatedEntities from './helpers/includeRelatedEntities';
import formatAndLogApiErrorResponse from './helpers/formatAndLogApiErrorResponse';
import formatApiSuccessResponse from './helpers/formatApiSuccessResponse';

export default async function streamApi(req: ExpressRequest, res: ExpressResponse) {
  try {
    const { currentUserId, query, headers } = req;
    const ver = TS.parseIntOrNull(query.ver) ?? 0;
    if (process.env.PRODUCTION && ver < Number.parseInt(process.env.JS_VERSION, 10)) {
      throw new UserFacingError('Client is outdated.', 469);
    }

    const apis = typeof query?.apis === 'string'
      ? safeParseJson<{ name: ApiName, params: any }[]>(
        query.apis,
        val => Array.isArray(val)
          && val.every(item => TS.isObj(item) && item.name && item.params),
      )
      : null;
    if (!apis) {
      throw new UserFacingError('Invalid request', 400);
    }

    res.status(200).set(STREAM_API_HEADERS);

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
    ) => RequestContextLocalStorage.run(
      {
        ...(getRC() as RequestContext),
        path: `/stream.${name}`,
      },
      async () => {
        const startTime = performance.now();
        const api = nameToApi.get(name.toLowerCase()) as unknown as ApiDefinition<Name>;
        let result: ApiSuccessResponse<Name> | ApiErrorResponse;
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
          let ret: ApiRouteRet<Name> | Promise<ApiRouteRet<Name>>;
          try {
            ret = api.handler(handlerParams, res);
            if (ret instanceof Promise) {
              ret = await promiseTimeout(
                ret,
                API_TIMEOUT,
                new UserFacingError('Request timed out', 504),
              );
            }
          } catch (err) {
            throw getErr(err, { ctx: `handler(${api.config.name})` });
          }

          if (performance.now() - startTime > API_TIMEOUT && numCompleted < apis.length - 1) {
            throw new UserFacingError('Request timed out', 504);
          }
          validateApiRet({ api, ret });
          if (relations) {
            includeRelatedEntities(ret, relations);
          }

          try {
            result = await formatApiSuccessResponse(name, ret);
          } catch (err) {
            throw getErr(err, { ctx: 'formatApiSuccessResponse' });
          }
        } catch (err) {
          result = formatAndLogApiErrorResponse(err, 'streamApi', name);
        }

        if (performance.now() - startTime > API_TIMEOUT && numCompleted < apis.length - 1) {
          throw new UserFacingError('Request timed out', 504);
        }

        if (IS_PROFILING_API
          || (!process.env.PRODUCTION && performance.now() - startTime > 100)) {
          // eslint-disable-next-line no-console
          console.log(`streamApi(${api.config.name}): handler took ${Math.round(performance.now() - startTime)}ms`);
        }

        if (!process.env.PRODUCTION && !IS_PROFILING_API && !getRC()?.loadTesting) {
          await pause(randInt(0, 200));
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
      },
    )));

    res.end();
  } catch (err) {
    const response = formatAndLogApiErrorResponse(err, 'apiWrap', 'stream');
    res.status(response.status)
      .set(STREAM_API_HEADERS)
      .send(JSON.stringify(
        response,
        null,
        process.env.PRODUCTION ? 0 : 2,
      ));
  }
}

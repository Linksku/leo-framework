import { API_TIMEOUT, STREAM_API_DELIM } from 'consts/server';
import { IS_PROFILING_APIS } from 'config';
import { STREAM_API_HEADERS } from 'consts/httpHeaders';
import safeParseJson from 'utils/safeParseJson';
import { nameToApi } from 'services/ApiManager';
import promiseTimeout from 'utils/promiseTimeout';
import randInt from 'utils/randInt';
import RequestContextLocalStorage from 'core/requestContext/RequestContextLocalStorage';
import formatApiHandlerParams from 'routes/apis/formatApiHandlerParams';
import validateApiParams from 'routes/apis/validateApiParams';
import validateApiRet from 'routes/apis/validateApiRet';
import includeRelatedEntities from 'routes/apis/includeRelatedEntities';
import formatAndLogApiErrorResponse from 'routes/apis/formatAndLogApiErrorResponse';
import formatApiSuccessResponse from 'routes/apis/formatApiSuccessResponse';

const JS_VERSION = Number.parseInt(process.env.JS_VERSION, 10);

export default async function streamApi(req: ExpressRequest, res: ExpressResponse) {
  try {
    const { currentUserId, query, headers } = req;
    const ver = TS.parseIntOrNull(query.ver) ?? 0;
    if (process.env.PRODUCTION && ver < JS_VERSION) {
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
        apiPath: `/stream.${name}`,
        apiParams: fullParams,
      },
      async () => {
        const startTime = performance.now();
        const api = nameToApi.get(name.toLowerCase()) as
          unknown as ApiDefinition<Name> | undefined;

        let result: ApiSuccessResponse<Name> | ApiErrorResponse;
        try {
          if (!api) {
            throw new UserFacingError('API not found.', 404);
          }

          const { relations, ..._params } = fullParams;
          const params = _params as ApiNameToParams[Name];
          validateApiParams({
            api,
            reqMethod: 'GET',
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
            ret = api.handler(handlerParams);
            if (ret instanceof Promise) {
              ret = await promiseTimeout(
                ret,
                {
                  timeout: API_TIMEOUT,
                  getErr: () => new UserFacingError('Request timed out', 504),
                },
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

        if (IS_PROFILING_APIS
          || (!process.env.PRODUCTION && performance.now() - startTime > 100)) {
          // eslint-disable-next-line no-console
          console.log(`streamApi(${name}): handler took ${Math.round(performance.now() - startTime)}ms`);
        }

        if (!process.env.PRODUCTION && !IS_PROFILING_APIS && !getRC()?.loadTesting) {
          await pause(randInt(0, 200));
        }

        if (waitForDrain) {
          await waitForDrain;
        }

        const response = [
          numCompleted === 0 ? '[\n' : '',
          JSON.stringify(
            {
              batchIdx,
              result,
            },
            null,
            process.env.PRODUCTION ? 0 : 2,
          ),
          STREAM_API_DELIM,
          numCompleted === apis.length - 1 ? '\n]' : ',\n',
        ].join('');
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

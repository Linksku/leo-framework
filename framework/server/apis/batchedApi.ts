import { defineApi, nameToApi } from 'services/ApiManager';
import RequestContextLocalStorage from 'core/requestContext/RequestContextLocalStorage';
import promiseTimeout from 'utils/promiseTimeout';
import { DEFAULT_API_TIMEOUT } from 'consts/server';
import { IS_PROFILING_APIS } from 'config';
import validateApiParams from 'routes/apis/validateApiParams';
import formatApiHandlerParams from 'routes/apis/formatApiHandlerParams';
import validateApiRet from 'routes/apis/validateApiRet';
import includeRelatedEntities from 'routes/apis/includeRelatedEntities';
import formatAndLogApiErrorResponse from 'routes/apis/formatAndLogApiErrorResponse';

// Deprecated by streamApi
defineApi(
  {
    name: 'batched',
    paramsSchema: {
      type: 'object',
      required: ['apis'],
      properties: {
        apis: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name', 'params'],
            properties: {
              name: SchemaConstants.name,
              params: SchemaConstants.pojo,
            },
            additionalProperties: false,
          },
          maxItems: 50,
        },
      },
      additionalProperties: false,
    },
    dataSchema: {
      type: 'object',
      required: ['results'],
      properties: {
        results: {
          type: 'array',
          items: {
            oneOf: [
              {
                type: 'object',
                required: ['batchIdx', 'data'],
                properties: {
                  _name: { type: 'string' },
                  batchIdx: SchemaConstants.nonNegInt,
                  data: { type: 'object' },
                },
                additionalProperties: false,
              },
              {
                type: 'object',
                required: ['batchIdx', 'status', 'error'],
                properties: {
                  _name: { type: 'string' },
                  batchIdx: SchemaConstants.nonNegInt,
                  status: SchemaConstants.nonNegInt,
                  error: {
                    type: 'object',
                    required: ['msg'],
                    properties: {
                      msg: { type: 'string' },
                      stack: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                      debugCtx: { type: 'object' },
                    },
                    additionalProperties: false,
                  },
                },
                additionalProperties: false,
              },
            ],
          },
        },
      },
      additionalProperties: false,
    },
  },
  async function batchedApi({ apis, currentUserId, userAgent }: ApiHandlerParams<'batched'>) {
    if ((!process.env.PRODUCTION
        && apis.filter(api => api.name !== 'checkEntityExists').length > 25)
      || apis.length > 50) {
      throw new Error('batchedApi: too many batched requests');
    }

    const rc = getRC();
    const typedApis = apis as { name: ApiName, params: ApiParams<ApiName> }[];
    const results = await Promise.all<ApiRouteRet<ApiName> | ApiErrorResponse>(typedApis.map(
      <Name extends ApiName>({ name, params: fullParams }: {
        name: Name,
        params: ApiParams<Name>,
      }) => RequestContextLocalStorage.run(
        {
          ...(rc as RequestContext),
          apiPath: `/batched.${name}`,
          apiParams: fullParams,
        },
        async () => {
          const startTime = performance.now();

          const api = nameToApi.get(name.toLowerCase()) as
          unknown as ApiDefinition<Name> | undefined;

          let result: ApiRouteRet<Name> | ApiErrorResponse;
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
              userAgent,
              api,
              params,
              currentUserId,
            });
            let ret = api.handler(handlerParams);
            if (ret instanceof Promise) {
              ret = await promiseTimeout(
                ret,
                {
                  timeout: api.config.timeout,
                  getErr: () => new UserFacingError('Request timed out', 504),
                },
              );
            }

            if (performance.now() - startTime > api.config.timeout) {
              throw new UserFacingError('Request timed out', 504);
            }

            validateApiRet({ api, ret });
            if (relations) {
              includeRelatedEntities(ret, relations);
            }
            result = ret;
          } catch (err) {
            result = formatAndLogApiErrorResponse(err, 'batchedApi', name);
          }

          if (IS_PROFILING_APIS
            || (!process.env.PRODUCTION && performance.now() - startTime > 100)) {
            // eslint-disable-next-line no-console
            console.log(`batchedApi(${name}): handler took ${Math.round(performance.now() - startTime)}ms`);
          }

          if (performance.now() - startTime > (api?.config.timeout ?? DEFAULT_API_TIMEOUT)) {
            throw new UserFacingError('Request timed out', 504);
          }
          return result;
        },
      ),
    ));

    const allDeletedIds: ApiSuccessResponse<any>['deletedIds'] = Object.create(null);
    for (const r of results) {
      if (TS.hasProp(r, 'deletedIds')) {
        for (const pair of TS.objEntries(r.deletedIds)) {
          const entityDeletedIds = TS.objValOrSetDefault(allDeletedIds, pair[0], []);
          entityDeletedIds.push(...pair[1]);
        }
      }
    }

    return {
      data: {
        results: results.map((r, idx) => {
          const result = TS.hasProp(r, 'data')
            ? {
              batchIdx: idx,
              data: r.data as any,
            }
            : {
              batchIdx: idx,
              ...r,
            };
          return process.env.PRODUCTION
            ? result
            : {
              _name: apis[idx].name,
              ...result,
            };
        }),
      },
      entities: results.flatMap(r => (TS.hasProp(r, 'entities') ? r.entities : [])),
      createdEntities: results.flatMap(
        r => (TS.hasProp(r, 'createdEntities') ? r.createdEntities : []),
      ),
      updatedEntities: results.flatMap(
        r => (TS.hasProp(r, 'updatedEntities') ? r.updatedEntities : []),
      ),
      deletedIds: allDeletedIds,
    };
  },
);

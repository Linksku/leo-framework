import { defineApi, nameToApi } from 'services/ApiManager';
import RequestContextLocalStorage from 'services/requestContext/RequestContextLocalStorage';
import promiseTimeout from 'utils/promiseTimeout';
import { API_TIMEOUT } from 'settings';
import validateApiParams from './helpers/validateApiParams';
import formatApiHandlerParams from './helpers/formatApiHandlerParams';
import validateApiRet from './helpers/validateApiRet';
import includeRelatedEntities from './helpers/includeRelatedEntities';
import formatAndLogApiErrorResponse from './helpers/formatAndLogApiErrorResponse';

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
  async function batchedApi({ apis, currentUserId, userAgent }: ApiHandlerParams<'batched'>, res) {
    if ((!process.env.PRODUCTION && apis.filter(api => api.name !== 'checkEntityExists').length > 25)
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
          path: `/batched.${name}`,
        },
        async () => {
          const startTime = performance.now();
          let result: ApiRouteRet<ApiName> | ApiErrorResponse;
          try {
            const api = nameToApi.get(name) as ApiDefinition<Name>;
            const { relations, ..._params } = fullParams;
            const params = _params as ApiNameToParams[Name];
            validateApiParams({
              api,
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
            result = ret;
          } catch (err) {
            result = formatAndLogApiErrorResponse(err, 'batchedApi', name);
          }

          if (!process.env.PRODUCTION && performance.now() - startTime > 100) {
            printDebug(
              `Handler took ${Math.round(performance.now() - startTime)}ms (${rc?.numDbQueries ?? 0} DB requests)`,
              performance.now() - startTime > 500 ? 'error' : 'warn',
              { ctx: `batchedApi(${name})` },
            );
          }
          if (performance.now() - startTime > API_TIMEOUT) {
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
    // todo: mid/hard stream batched results as they become available
    return {
      data: {
        results: results.map((r, idx) => {
          const result = TS.hasProp(r, 'data')
            ? {
              batchIdx: idx,
              data: r.data as any,
            }
            : { ...r, batchIdx: idx };
          return process.env.PRODUCTION
            ? result
            : {
              _name: apis[idx].name,
              ...result,
            };
        }),
      },
      entities: results.flatMap(r => (TS.hasProp(r, 'entities') ? r.entities : [])),
      createdEntities: results.flatMap(r => (TS.hasProp(r, 'createdEntities') ? r.createdEntities : [])),
      updatedEntities: results.flatMap(r => (TS.hasProp(r, 'updatedEntities') ? r.updatedEntities : [])),
      deletedIds: allDeletedIds,
    };
  },
);

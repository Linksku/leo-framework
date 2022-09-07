import omit from 'lodash/omit';

import { defineApi, nameToApi } from 'services/ApiManager';
import RequestContextLocalStorage from 'services/requestContext/RequestContextLocalStorage';
import validateApiParams from './helpers/validateApiParams';
import formatApiHandlerParams from './helpers/formatApiHandlerParams';
import validateApiRet from './helpers/validateApiRet';
import includeRelatedEntities from './helpers/includeRelatedEntities';
import formatApiErrorResponse from './helpers/formatApiErrorResponse';

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
                required: ['data'],
                properties: {
                  _name: { type: 'string' },
                  data: SchemaConstants.pojo.orNull(),
                },
                additionalProperties: false,
              },
              {
                type: 'object',
                required: ['status', 'error'],
                properties: {
                  _name: { type: 'string' },
                  status: SchemaConstants.nonNegInt,
                  error: SchemaConstants.pojo,
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
  async function batchedApi({ apis, currentUserId }: ApiHandlerParams<'batched'>, res) {
    if ((!process.env.PRODUCTION && apis.length > 25) || apis.length > 50) {
      throw new Error('batchedApi: too many batched requests');
    }

    const rc = getRC();
    const typedApis = apis as { name: ApiName, params: ApiParams<ApiName> }[];
    const results = await Promise.all<ApiRouteRet<ApiName> | ApiErrorResponse>(typedApis.map(
      // Must be async for RequestContextLocalStorage.enterWith
      async <Name extends ApiName>({ name, params: fullParams }: {
        name: Name,
        params: ApiParams<Name>,
      }) => {
        const startTime = performance.now();
        let result: ApiRouteRet<ApiName> | ApiErrorResponse;
        try {
          if (rc) {
            RequestContextLocalStorage.enterWith({
              ...rc,
              path: `/batched.${name}`,
            });
          }

          const api = nameToApi[name] as ApiDefinition<Name>;
          const { relations } = fullParams;
          const params = omit(fullParams, 'relations') as ApiNameToParams[Name];
          validateApiParams({
            api,
            params,
            relations,
            currentUserId,
          });

          const handlerParams = formatApiHandlerParams({
            api,
            params,
            currentUserId,
          });
          let ret = api.handler(handlerParams, res);
          if (ret instanceof Promise) {
            ret = await ret;
          }

          validateApiRet({ api, ret });
          if (relations) {
            includeRelatedEntities(ret, relations);
          }
          result = ret;
        } catch (err) {
          ErrorLogger.error(ErrorLogger.castError(err), `batchedApi: ${name}`);

          result = formatApiErrorResponse(err, name);
        }

        if (performance.now() - startTime > 100) {
          printDebug(
            `Handler took ${Math.round(performance.now() - startTime)}ms`,
            performance.now() - startTime > 500 ? 'error' : 'warn',
            `batchedApi(${name})`,
          );
        }
        return result;
      },
    ));

    // todo: mid/hard stream batched results as they become available
    return {
      data: {
        results: results.map((r, idx) => {
          if (process.env.PRODUCTION) {
            return TS.hasProp(r, 'data') ? { data: r.data } : r;
          }
          return TS.hasProp(r, 'data')
            ? {
              _name: apis[idx].name,
              data: r.data,
            }
            : {
              _name: apis[idx].name,
              ...r,
            };
        }),
      },
      entities: results.flatMap(r => (TS.hasProp(r, 'entities') ? r.entities : [])),
      createdEntities: results.flatMap(r => (TS.hasProp(r, 'createdEntities') ? r.createdEntities : [])),
      updatedEntities: results.flatMap(r => (TS.hasProp(r, 'updatedEntities') ? r.updatedEntities : [])),
      deletedIds: results.flatMap(r => (TS.hasProp(r, 'deletedIds') ? r.deletedIds : [])),
    };
  },
);

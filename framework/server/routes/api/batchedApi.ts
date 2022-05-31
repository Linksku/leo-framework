import { defineApi, nameToApi } from 'services/ApiManager';
import RequestContextLocalStorage from 'services/requestContext/RequestContextLocalStorage';
import handleApiError from './helpers/handleApiError';
import apiHandlerWrap from './helpers/apiHandlerWrap';

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
                  data: {
                    anyOf: [
                      { type: 'null' },
                      SchemaConstants.pojo,
                    ],
                  },
                },
                additionalProperties: false,
              },
              {
                type: 'object',
                required: ['status', 'error'],
                properties: {
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
    const rc = getRC();
    const typedApis = apis as { name: ApiName, params: ApiNameToParams[ApiName] }[];
    const results = await Promise.all<ApiRouteRet<any> | ApiErrorResponse>(typedApis.map(
      // Must be async for RequestContextLocalStorage.enterWith
      async <Name extends ApiName>({ name, params }: {
        name: Name,
        params: ApiNameToParams[Name],
      }) => {
        try {
          const api = nameToApi[name] as ApiDefinition<Name>;

          if (rc) {
            RequestContextLocalStorage.enterWith({
              ...rc,
              path: `/batched.${name}`,
            });
          }
          const ret = await apiHandlerWrap(
            api,
            params,
            currentUserId,
            res,
          );
          return ret;
        } catch (err) {
          ErrorLogger.error(err, `batchedApi: ${name}`);

          const { status, errorData } = handleApiError(err, name);
          return {
            status,
            error: errorData,
          };
        }
      },
    ));

    // todo: high/hard stream batched results as they become available
    return {
      data: {
        results: results.map(r => (
          TS.hasProp(r, 'data')
            ? { data: r.data }
            : r
        )),
      },
      entities: results.flatMap(r => (TS.hasProp(r, 'entities') ? r.entities : [])),
      createdEntities: results.flatMap(r => (TS.hasProp(r, 'createdEntities') ? r.createdEntities : [])),
      updatedEntities: results.flatMap(r => (TS.hasProp(r, 'updatedEntities') ? r.updatedEntities : [])),
      deletedIds: results.flatMap(r => (TS.hasProp(r, 'deletedIds') ? r.deletedIds : [])),
    };
  },
);

import type { Api, RouteRet } from 'services/ApiManager';
import { defineApi, nameToApi } from 'services/ApiManager';
import validateApiData from 'lib/apiHelpers/validateApiData';
import handleApiError from 'lib/apiHelpers/handleApiError';
import { unserializeDateProps } from 'lib/dateSchemaHelpers';

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
  async function batched({ apis, currentUserId }, res) {
    const typedApis = apis as { name: ApiName, params: ApiNameToParams[ApiName] }[];
    const results = await Promise.all<RouteRet<any> | ApiErrorResponse>(typedApis.map(
      async <Name extends ApiName>({ name, params }: {
        name: Name,
        params: ApiNameToParams[Name],
      }) => {
        try {
          const api = nameToApi[name] as Api<Name>;
          await validateApiData('params', api.validateParams, params);
          if (api.config.paramsSchema) {
            params = unserializeDateProps(api.config.paramsSchema, params);
          }

          const newParams: ApiNameToParams[Name] & { currentUserId: number | undefined } = {
            ...params,
            currentUserId,
          };

          let ret = api.handler(newParams, res);
          if (ret instanceof Promise) {
            ret = await ret;
          }

          if (api.validateData) {
            if (ret.data) {
              await validateApiData('data', api.validateData, ret.data);
            } else {
              throw new HandledError(`Api didn't include data: ${name}`, 500);
            }
          }

          if (process.env.NODE_ENV !== 'production' && Object.keys(ret).filter(
            k => k !== 'entities' && k !== 'data',
          ).length) {
            throw new HandledError(`Api contains extra keys: ${name}`, 500);
          }

          return ret;
        } catch (err) {
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
          TS.hasDefinedProperty(r, 'data')
            ? { data: r.data }
            : r
        )),
      },
      entities: results.flatMap(r => (TS.hasDefinedProperty(r, 'entities') ? r.entities : [])),
      createdEntities: results.flatMap(r => (TS.hasDefinedProperty(r, 'createdEntities') ? r.createdEntities : [])),
      updatedEntities: results.flatMap(r => (TS.hasDefinedProperty(r, 'updatedEntities') ? r.updatedEntities : [])),
      deletedIds: results.flatMap(r => (TS.hasDefinedProperty(r, 'deletedIds') ? r.deletedIds : [])),
    };
  },
);

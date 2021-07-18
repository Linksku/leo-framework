import type { Api, RouteRet } from 'services/ApiManager';
import { defineApi, nameToApi } from 'services/ApiManager';
import validateApiData from 'lib/apiWrap/validateApiData';
import handleApiError from 'lib/apiWrap/handleApiError';

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
              name: SchemaConstants.content,
              params: { type: 'object' },
            },
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
            type: 'object',
            properties: {
              status: SchemaConstants.nonNegInt,
              data: {
                anyOf: [
                  { type: 'null' },
                  { type: 'object' },
                ],
              },
              error: { type: 'object' },
            },
          },
        },
      },
      additionalProperties: false,
    },
  },
  async function batched({ apis, currentUserId }, res) {
    const typedApis = apis as { name: ApiName, params: ApiNameToParams[ApiName] }[];
    const results = await Promise.all<RouteRet<any> & { status: number }>(typedApis.map(
      async <Name extends ApiName>({ name, params }: {
        name: Name,
        params: ApiNameToParams[Name],
      }) => {
        try {
          const api = nameToApi[name] as Api<Name>;
          await validateApiData('params', api.validateParams, params);
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

          return {
            status: 200,
            ...ret,
          };
        } catch (err) {
          const { status, errorData } = handleApiError(err, name);
          return {
            status,
            data: null,
            error: errorData,
            entities: [],
          };
        }
      },
    ));

    // todo: high/hard stream batched results as they become available
    return {
      data: {
        results: results.map(r => ({
          status: r.status,
          data: r.data,
          error: r.error,
        })),
      },
      entities: results.flatMap(r => r.entities ?? []),
    };
  },
);

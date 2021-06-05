import type { Api, RouteRet } from 'services/ApiManager';
import { defineApi, nameToApi } from 'services/ApiManager';
import validateApiData from 'lib/apiWrap/validateApiData';

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
            type: ['object', 'null'],
          },
        },
      },
      additionalProperties: false,
    },
  },
  async function batched({ apis, currentUserId }, res) {
    const typedApis = apis as { name: ApiName, params: ApiNameToParams[ApiName] }[];
    const results = await Promise.all<RouteRet<any>>(typedApis.map(
      async <Name extends ApiName>({ name, params }: {
        name: Name,
        params: ApiNameToParams[Name],
      }) => {
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

        return ret;
      },
    ));

    return {
      data: {
        results: results.map(r => r.data),
      },
      entities: results.map(r => r.entities ?? []).flat(),
    };
  },
);

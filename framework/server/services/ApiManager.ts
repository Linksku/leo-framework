import type { ValidateFunction } from 'ajv';

import ajv from 'lib/ajv';

export type RouteRet<Name extends ApiName> = Pick<
  ApiSuccessResponse<Name>,
  'data' | 'deletedIds'
> & {
  entities?: Model[];
  createdEntities?: Model[];
  updatedEntities?: Model[];
};

export type ApiConfig<Name extends ApiName> = {
  method?: 'get' | 'post',
  name: Name,
  auth?: boolean,
  paramsSchema: {
    type: 'object',
    required?: string[],
    properties: Record<string, JSONSchema>,
    additionalProperties: false,
  },
  dataSchema?: {
    type: 'object',
    required?: string[],
    properties: Record<string, JSONSchema>,
    additionalProperties: false,
  },
  fileFields?: { name: (keyof ApiNameToParams[Name]) & string, maxCount: number }[],
};

export type ApiHandler<Name extends ApiName> = (
  params: ApiNameToParams[Name] & {
    currentUserId: Name extends AuthApiName ? EntityId : EntityId | undefined;
  },
  // todo: low/mid add cookies to RouteRet instead of passing res to apis
  res: ExpressResponse,
) => RouteRet<Name> | Promise<RouteRet<Name>>;

export type ApiDefinition<Name extends ApiName> = {
  config: ApiConfig<Name>,
  validateParams: ValidateFunction,
  validateData?: ValidateFunction,
  handler: ApiHandler<Name>,
};

export const apis = [] as ApiDefinition<any>[];
export const nameToApi = {} as ObjectOf<ApiDefinition<any>>;

export function defineApi<Name extends ApiName>(
  config: ApiConfig<Name>,
  handler: ApiHandler<Name>,
) {
  const api = {
    config,
    validateParams: ajv.compile(config.paramsSchema ?? {}),
    ...config.dataSchema && { validateData: ajv.compile(config.dataSchema) },
    handler,
  };
  apis.push(api);
  nameToApi[config.name] = api;
}

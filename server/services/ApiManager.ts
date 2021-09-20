import type { ValidateFunction } from 'ajv';
import type { JSONSchemaDefinition } from 'objection';

import ajv from 'lib/ajv';

export type RouteRet<Name extends ApiName> = Pick<
  ApiSuccessResponse<Name>,
  'data' | 'deletedIds'
> & {
  entities?: Nullish<Entity>[];
  createdEntities?: Nullish<Entity>[];
  updatedEntities?: Nullish<Entity>[];
};

export type ApiConfig<Name extends ApiName> = {
  method?: 'get' | 'post',
  name: Name,
  auth?: boolean,
  paramsSchema: {
    type: 'object',
    required?: string[],
    properties: Record<string, JSONSchemaDefinition>,
    additionalProperties: false,
  },
  dataSchema?: {
    type: 'object',
    required?: string[],
    properties: Record<string, JSONSchemaDefinition>,
    additionalProperties: false,
  },
  fileFields?: { name: (keyof ApiNameToParams[Name]) & string, maxCount: number }[],
};

export type ApiHandler<Name extends ApiName> = (
  params: ApiNameToParams[Name],
  res: ExpressResponse,
) => RouteRet<Name> | Promise<RouteRet<Name>>;

export type Api<Name extends ApiName> = {
  config: ApiConfig<Name>,
  validateParams: ValidateFunction,
  validateData?: ValidateFunction,
  handler: ApiHandler<Name>,
};

export const apis = [] as Api<any>[];
export const nameToApi = {} as ObjectOf<Api<any>>;

export function defineApi<Name extends ApiName>(
  config: ApiConfig<Name>,
  handler: (
    params: ApiNameToParams[Name] & (
      Name extends AuthApiName ? { currentUserId: number } : { currentUserId: number | undefined }
    ),
    res: ExpressResponse,
  ) => RouteRet<Name> | Promise<RouteRet<Name>>,
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

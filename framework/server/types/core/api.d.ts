import type { ValidateFunction } from 'ajv';

declare global {
  type ApiRouteRet<Name extends ApiName> = Pick<
    ApiSuccessResponse<Name>,
    'data' | 'deletedIds'
  > & {
    entities?: Model[];
    createdEntities?: Model[];
    updatedEntities?: Model[];
  };

  type ApiConfig<Name extends ApiName> = {
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

  type ApiHandlerParams<Name extends ApiName> = ApiNameToParams[Name] & {
    currentUserId: EntityId | (Name extends AuthApiName ? never : undefined);
  };

  type ApiHandler<Name extends ApiName> = (
    params: ApiHandlerParams<Name>,
    // todo: low/mid add cookies to ApiRouteRet instead of passing res to apis
    res: ExpressResponse,
  ) => ApiRouteRet<Name> | Promise<ApiRouteRet<Name>>;

  type ApiDefinition<Name extends ApiName> = {
    config: ApiConfig<Name>,
    validateParams: ValidateFunction,
    validateData?: ValidateFunction,
    handler: ApiHandler<Name>,
  };
}
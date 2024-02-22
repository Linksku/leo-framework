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
      properties: Record<string, JsonSchema>,
      additionalProperties: false,
    },
    dataSchema?: {
      type: 'object',
      required?: string[],
      properties: Record<string, JsonSchema>,
      additionalProperties: false,
    },
    fileFields?: {
      name: (keyof ApiNameToParams[Name]) & string,
      maxCount: number,
    }[],
  };

  type ApiHandlerParams<Name extends ApiName> = ApiNameToParams[Name] & {
    userAgent?: string,
    currentUserId: EntityId | (Name extends AuthApiName ? never : undefined);
  };

  type ApiHandler<Name extends ApiName> = (
    params: ApiHandlerParams<Name>,
    res: ExpressResponse,
  ) => ApiRouteRet<Name> | Promise<ApiRouteRet<Name>>;

  type ApiDefinition<Name extends ApiName> = {
    config: ApiConfig<Name>,
    validateParams: ValidateFunction,
    validateData?: ValidateFunction,
    handler: ApiHandler<Name>,
  };
}

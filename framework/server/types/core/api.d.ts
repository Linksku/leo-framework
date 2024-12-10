import type { CookieOptions } from 'express-serve-static-core';

type ApiCookieName = 'authToken';

declare global {
  type ApiRouteRet<Name extends ApiName> = Pick<
    ApiSuccessResponse<Name>,
    'data' | 'deletedIds'
  > & {
    entities?: Model[],
    createdEntities?: Model[],
    updatedEntities?: Model[],
    cookies?: Partial<Record<
      ApiCookieName,
      { val: string, opts: CookieOptions } | null
    >>
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
      type: 'image' | 'video' | 'imageVideo',
      maxCount: number,
    }[],
  };

  type ApiHandlerParams<Name extends ApiName> = ApiNameToParams[Name] & {
    userAgent?: string,
    currentUserId: EntityId | (Name extends AuthApiName ? never : undefined);
  };

  type ApiHandler<Name extends ApiName> = (
    params: ApiHandlerParams<Name>,
  ) => ApiRouteRet<Name> | Promise<ApiRouteRet<Name>>;

  type ApiDefinition<Name extends ApiName> = {
    config: ApiConfig<Name>,
    handler: ApiHandler<Name>,
  };
}

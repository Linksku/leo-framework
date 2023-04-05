import { unserializeDateProps } from 'utils/models/dateSchemaHelpers';

export default function formatApiHandlerParams<Name extends ApiName>({
  userAgent,
  api,
  params,
  currentUserId,
}: {
  userAgent?: string,
  api: ApiDefinition<Name>,
  params: ApiNameToParams[Name],
  currentUserId: EntityId | undefined,
}): ApiHandlerParams<Name> {
  if (api.config.paramsSchema) {
    params = unserializeDateProps(
      api.config.paramsSchema.properties,
      params,
    ) as ApiNameToParams[Name];
  }

  return {
    userAgent,
    ...params,
    currentUserId: currentUserId as EntityId | (Name extends AuthApiName ? never : undefined),
  };
}

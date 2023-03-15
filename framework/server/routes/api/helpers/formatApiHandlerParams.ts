import { unserializeDateProps } from 'utils/models/dateSchemaHelpers';

export default function formatApiHandlerParams<Name extends ApiName>({
  api,
  params,
  currentUserId,
}: {
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
    ...params,
    currentUserId: currentUserId as EntityId | (Name extends AuthApiName ? never : undefined),
  };
}

import isModelType from 'utils/models/isModelType';
import getRelation from 'utils/models/getRelation';
import apiValidateFn from './apiValidateFn';

function validateRelations(relations: unknown) {
  if (!relations || typeof relations !== 'object') {
    throw new UserFacingError('Invalid relations object', 400);
  }

  for (const [type, relationNames] of Object.entries(relations)) {
    if (!isModelType(type) || !Array.isArray(relationNames)
      || relationNames.some(name => typeof name !== 'string')) {
      throw new UserFacingError(`Invalid relations for type "${type}"`, 400);
    }

    for (const name of relationNames) {
      getRelation(type, name);
    }
  }
}

export default function validateApiParams<Name extends ApiName>({
  api,
  params,
  relations,
  currentUserId,
}: {
  api: ApiDefinition<Name>,
  params: ApiNameToParams[Name],
  relations: unknown,
  currentUserId: EntityId | undefined,
}) {
  if (api.config.auth && (typeof currentUserId !== 'number' || currentUserId <= 0)) {
    throw new UserFacingError('Not authenticated', 401);
  }

  if (relations) {
    validateRelations(relations);
  }

  apiValidateFn('params', api.config.name, api.validateParams, params);
}

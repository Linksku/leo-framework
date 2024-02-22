import isModelType from 'utils/models/isModelType';
import getRelation from 'utils/models/getRelation';
import apiValidateFn from './apiValidateFn';

function validateRelations(relations: unknown) {
  if (!relations || typeof relations !== 'object') {
    throw new Error('Invalid relations object');
  }

  for (const type of Object.keys(relations)) {
    if (!isModelType(type)) {
      throw new Error(`Invalid model type "${type}"`);
    }
    const relationNames = (relations as Record<string, unknown>)[type];
    if (!Array.isArray(relationNames)
      || (!process.env.PRODUCTION && relationNames.some(name => typeof name !== 'string'))) {
      throw getErr(`Invalid relations for type "${type}"`, { relationNames });
    }

    for (const name of (relationNames as string[])) {
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

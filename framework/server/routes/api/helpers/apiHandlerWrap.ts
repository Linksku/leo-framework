import omit from 'lodash/omit';

import { unserializeDateProps } from 'utils/models/dateSchemaHelpers';
import isModelType from 'utils/models/isModelType';
import getModelClass from 'services/model/getModelClass';
import validateApiData from './validateApiData';

function validateRelations(relations: unknown) {
  if (!relations || typeof relations !== 'object') {
    throw new HandledError('Invalid relations object', 400);
  }

  for (const [type, relationNames] of Object.entries(relations)) {
    if (!isModelType(type) || !Array.isArray(relationNames)
      || relationNames.some(name => typeof name !== 'string')) {
      throw new HandledError(`Invalid relations for type "${type}"`, 400);
    }

    const modelRelations = getModelClass(type).relationsMap;
    for (const fullName of relationNames as string[]) {
      const parts = fullName.split('.');
      if (parts.length > 2) {
        throw new Error(`Invalid relation "${fullName}"`);
      }
      const [name, nestedName] = parts;
      if (!TS.hasProp(modelRelations, name)) {
        throw new HandledError(`Invalid relation "${type}.${name}"`, 400);
      }
      if (nestedName) {
        const nestedModel = TS.defined(modelRelations[name]).toModel;
        if (!TS.hasProp(nestedModel.relationsMap, nestedName)) {
          throw new HandledError(`Invalid nested relation "${nestedModel.type}.${nestedName}"`, 400);
        }
      }
    }
  }
}

export default async function apiHandlerWrap<Name extends ApiName>(
  api: ApiDefinition<Name>,
  fullParams: ApiParams<Name>,
  currentUserId: EntityId | undefined,
  res: ExpressResponse,
): Promise<ApiRouteRet<Name>> {
  if (api.config.auth && (typeof currentUserId !== 'number' || currentUserId <= 0)) {
    throw new HandledError('Not authenticated', 401);
  }

  const { relations } = fullParams;
  let params: ApiNameToParams[Name] = relations
    ? omit(fullParams, 'relations') as ApiNameToParams[Name]
    : fullParams;
  if (relations) {
    validateRelations(relations);
  }

  validateApiData('params', api.validateParams, params);
  if (api.config.paramsSchema) {
    params = unserializeDateProps(api.config.paramsSchema, params) as ApiNameToParams[Name];
  }

  const paramsWithUser = {
    ...params,
    currentUserId: currentUserId as EntityId | (Name extends AuthApiName ? never : undefined),
  };

  let ret = api.handler(paramsWithUser, res);
  if (ret instanceof Promise) {
    ret = await ret;
  }

  if (api.validateData) {
    if (ret.data) {
      validateApiData('data', api.validateData, ret.data);
    } else if (!process.env.PRODUCTION) {
      throw new HandledError(`apiHandlerWrap: ${api.config.name} didn't return data`, 500);
    }
  }

  if (relations) {
    const allEntities = [
      ...(ret.entities ?? []),
      ...(ret.createdEntities ?? []),
      ...(ret.updatedEntities ?? []),
    ];
    await Promise.all(allEntities.map(ent => {
      const relationNames = relations[(ent.constructor as ModelClass).type];
      if (!relationNames?.length) {
        return null;
      }

      // @ts-ignore relations type
      return ent.includeRelated(relationNames);
    }));
  }

  if (!process.env.PRODUCTION && Object.keys(ret).some(
    k => !TS.inArray(k, ['data', 'entities', 'createdEntities', 'updatedEntities', 'deletedIds']),
  )) {
    throw new HandledError(`apiHandlerWrap: ${api.config.name} contains extra keys: ${Object.keys(ret).join(', ')}`, 500);
  }

  return ret;
}

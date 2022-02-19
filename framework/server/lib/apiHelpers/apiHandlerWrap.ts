import type { ApiDefinition, RouteRet } from 'services/ApiManager';
import { unserializeDateProps } from 'lib/modelUtils/dateSchemaHelpers';
import validateApiData from './validateApiData';

export default async function apiHandlerWrap<Name extends ApiName>(
  api: ApiDefinition<Name>,
  params: ApiNameToParams[Name],
  currentUserId: EntityId | undefined,
  res: ExpressResponse,
): Promise<RouteRet<Name>> {
  if (api.config.auth && (typeof currentUserId !== 'number' || currentUserId <= 0)) {
    throw new HandledError('Not authenticated', 401);
  }

  validateApiData('params', api.validateParams, params);
  if (api.config.paramsSchema) {
    params = unserializeDateProps(api.config.paramsSchema, params) as ApiNameToParams[Name];
  }

  const paramsWithUser = {
    ...params,
    currentUserId: currentUserId as Name extends AuthApiName ? EntityId : EntityId | undefined,
  };

  let ret = api.handler(paramsWithUser, res);
  if (ret instanceof Promise) {
    ret = await ret;
  }

  if (api.validateData) {
    if (ret.data) {
      validateApiData('data', api.validateData, ret.data);
    } else if (process.env.NODE_ENV !== 'production') {
      throw new HandledError(`apiHandlerWrap: ${api.config.name} didn't return data`, 500);
    }
  }

  if (process.env.NODE_ENV !== 'production' && Object.keys(ret).some(
    k => !TS.inArray(k, ['data', 'entities', 'createdEntities', 'updatedEntities', 'deletedIds']),
  )) {
    throw new HandledError(`apiHandlerWrap: ${api.config.name} contains extra keys: ${Object.keys(ret).join(', ')}`, 500);
  }

  return ret;
}

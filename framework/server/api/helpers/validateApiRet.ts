import { IS_PROFILING_API } from 'consts/infra';
import apiValidateFn from './apiValidateFn';

export default function validateApiRet<Name extends ApiName>({
  api,
  ret,
}: {
  api: ApiDefinition<Name>,
  ret: ApiRouteRet<Name>,
}) {
  if (api.validateData) {
    if (ret.data) {
      apiValidateFn('data', api.config.name, api.validateData, ret.data);
    } else if (!process.env.PRODUCTION) {
      throw new UserFacingError(`${api.config.name} didn't return data`, 500);
    }
  }

  if (!process.env.PRODUCTION && Object.keys(ret).some(
    k => !TS.inArray(k, ['data', 'entities', 'createdEntities', 'updatedEntities', 'deletedIds']),
  )) {
    throw new Error(
      `${api.config.name} contains extra keys: ${Object.keys(ret).join(', ')}`,
    );
  }

  if (ret.entities) {
    ret.entities = TS.filterNulls(ret.entities);
  }
  if (ret.createdEntities) {
    ret.createdEntities = TS.filterNulls(ret.createdEntities);
  }
  if (ret.updatedEntities) {
    ret.updatedEntities = TS.filterNulls(ret.updatedEntities);
  }

  if (!process.env.PRODUCTION && !IS_PROFILING_API) {
    // Detects selecting partial rows without using ModelSelector methods
    for (const ent of [
      ...(ret.entities ?? []),
      ...(ret.createdEntities ?? []),
      ...(ret.updatedEntities ?? []),
    ]) {
      ent.$validate();
    }
  }
}

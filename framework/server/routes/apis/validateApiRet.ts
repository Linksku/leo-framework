import { IS_PROFILING_APIS } from 'config';
import apiValidateFn from './apiValidateFn';

const API_RET_KEYS = TS.literal([
  'data',
  'entities',
  'createdEntities',
  'updatedEntities',
  'deletedIds',
  'cookies',
] as const) satisfies (keyof ApiRouteRet<any>)[];

export default function validateApiRet<Name extends ApiName>({
  api,
  ret,
}: {
  api: ApiDefinition<Name>,
  ret: ApiRouteRet<Name>,
}) {
  if (api.config.dataSchema) {
    if (ret.data) {
      apiValidateFn('data', api.config.name, api.config.dataSchema, ret.data);
    } else if (!process.env.PRODUCTION) {
      throw new UserFacingError(`${api.config.name} didn't return data`, 500);
    }
  }

  if (!process.env.PRODUCTION && Object.keys(ret).some(
    k => !TS.includes(API_RET_KEYS, k),
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

  if (!process.env.PRODUCTION && !IS_PROFILING_APIS) {
    // Detects selecting partial rows without using ModelSelector methods
    const allEntities = (ret.entities ?? [])
      .concat(ret.createdEntities ?? [], ret.updatedEntities ?? []);
    for (const ent of allEntities) {
      ent.$validate();
    }
  }

  if (ret.cookies && api.config.method === 'get') {
    // Can't set cookies in streamApi because body could be sent before cookie headers
    throw new Error(
      `${api.config.name} can't return cookies in a GET request`,
    );
  }
}

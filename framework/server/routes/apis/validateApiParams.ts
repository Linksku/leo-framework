import isModelType from 'utils/models/isModelType';
import getRelation from 'utils/models/getRelation';
import { IMG_MEDIA_TYPES, VIDEO_MEDIA_TYPES } from 'consts/coreMedia';
import apiValidateFn from './apiValidateFn';

function validateUploadTypes<Name extends ApiName>(
  fileFields: Exclude<ApiConfig<Name>['fileFields'], undefined>,
  params: ApiNameToParams[Name],
) {
  for (const fileField of fileFields) {
    const param = params[fileField.name] as
      | Express.Multer.File
      | Express.Multer.File[]
      | undefined;
    if (!param) {
      continue;
    }

    const files = Array.isArray(param) ? param : [param];
    for (const file of files) {
      if (fileField.type === 'image' && !TS.hasProp(IMG_MEDIA_TYPES, file.mimetype)) {
        throw new UserFacingError('Expected upload to be image', 400);
      }
      if (fileField.type === 'video' && !TS.hasProp(VIDEO_MEDIA_TYPES, file.mimetype)) {
        throw new UserFacingError('Expected upload to be video', 400);
      }
      if (fileField.type === 'imageVideo'
        && !TS.hasProp(IMG_MEDIA_TYPES, file.mimetype)
        && !TS.hasProp(VIDEO_MEDIA_TYPES, file.mimetype)) {
        throw new UserFacingError('Expected upload to be image or video', 400);
      }
    }
  }
}

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
  reqMethod,
  params,
  relations,
  currentUserId,
}: {
  api: ApiDefinition<Name>,
  reqMethod: string,
  params: ApiNameToParams[Name],
  relations: unknown,
  currentUserId: EntityId | undefined,
}) {
  if ((reqMethod === 'GET' && api.config.method && api.config.method !== 'get')
    || (reqMethod !== 'GET' && (!api.config.method || api.config.method === 'get'))) {
    throw new UserFacingError('Unexpected request method.', 405);
  }

  if (api.config.auth && (typeof currentUserId !== 'number' || currentUserId <= 0)) {
    throw new UserFacingError('Not authenticated.', 401);
  }

  if (api.config.fileFields) {
    validateUploadTypes(api.config.fileFields, params);
  }

  if (relations) {
    validateRelations(relations);
  }

  apiValidateFn('params', api.config.name, api.config.paramsSchema, params);
}

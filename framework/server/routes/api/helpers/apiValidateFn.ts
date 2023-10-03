import type { ValidateFunction } from 'ajv';

import ucFirst from 'utils/ucFirst';

export default function apiValidateFn(
  type: 'params' | 'data',
  apiName: ApiName,
  validateFn: ValidateFunction,
  data: any,
) {
  if (!validateFn(data)) {
    const error = validateFn.errors?.[0];
    const errorPath = error?.instancePath
      ?.replace(/^[^/A-Za-z]/, '')
      .split('/')
      .filter(Boolean);

    const errParts: string[] = [];
    if (errorPath?.length) {
      errParts.push(`${errorPath.join('.')}`);
    }
    if (error?.message) {
      errParts.push(`${error.message.toLowerCase()}`);

      if (error?.params?.additionalProperty) {
        errParts.push(`(${error.params.additionalProperty})`);
      }
    }

    const debugErrMsg = `${ucFirst(apiName)} ${type}: ${
      errParts.length
        ? errParts.join(' ')
        : 'unknown error'
    }.`;
    if (!process.env.PRODUCTION) {
      throw new UserFacingError(
        debugErrMsg,
        type === 'params' ? 400 : 500,
      );
    }

    if (type === 'params') {
      if (errParts.length) {
        throw new UserFacingError(
          `${ucFirst(errParts.join(' '))}.`,
          400,
        );
      }
      if (errorPath?.length) {
        throw new UserFacingError(
          `Invalid format for ${errorPath.at(-1)}.`,
          400,
        );
      }
      throw new UserFacingError('Received invalid data.', 400);
    }

    ErrorLogger.error(
      new Error(debugErrMsg),
      { ctx: 'apiValidateFn', apiName },
    );
    throw new UserFacingError('Unknown server error.', 500);
  }
}

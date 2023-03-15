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

    const debugErrParts: string[] = [];
    if (errorPath?.length) {
      debugErrParts.push(`${errorPath.join('.')}`);
    }
    if (error?.message) {
      debugErrParts.push(`${error.message.toLowerCase()}`);

      if (error?.params?.additionalProperty) {
        debugErrParts.push(`(${error.params.additionalProperty})`);
      }
    }
    if (!debugErrParts.length) {
      debugErrParts.push('unknown error');
    }
    const debugErrMsg = `${ucFirst(apiName)} ${type}: ${debugErrParts.join(' ')}.`;

    if (!process.env.PRODUCTION) {
      throw new UserFacingError(
        debugErrMsg,
        type === 'params' ? 400 : 500,
      );
    }

    if (type === 'params') {
      if (errorPath?.length) {
        throw new UserFacingError(
          `Invalid format for ${errorPath[errorPath.length - 1]}.`,
          400,
        );
      }
      throw new UserFacingError('Received invalid data.', 400);
    }

    const newErr = getErr(debugErrMsg, { ctx: 'apiValidateFn', apiName });
    ErrorLogger.error(newErr);
    throw new UserFacingError(
      'Unknown server error.',
      500,
      { ...(newErr instanceof Error && newErr.debugCtx), origErr: newErr },
    );
  }
}

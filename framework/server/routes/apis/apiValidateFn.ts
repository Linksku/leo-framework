import type { ValidateFunction } from 'ajv';

import getAjv from 'services/getAjv';
import ucFirst from 'utils/ucFirst';

const validateFns = new Map<JsonSchema, ValidateFunction>();

export function getCompiledValidator(schema: JsonSchema) {
  let validateFn = validateFns.get(schema);
  if (!validateFn) {
    validateFn = getAjv().compile(schema);
    validateFns.set(schema, validateFn);
  }
  return validateFn;
}

export default function apiValidateFn(
  type: 'params' | 'data',
  apiName: ApiName,
  validateSchema: JsonSchema,
  data: any,
) {
  const validateFn = getCompiledValidator(validateSchema);

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

    if (type === 'params') {
      if (errParts.length) {
        throw new UserFacingError(
          `${ucFirst(errParts.join(' '))}.`,
          {
            status: 400,
            debugCtx: { apiName, type },
          },
        );
      }
      if (errorPath?.length) {
        throw new UserFacingError(
          `Invalid format for ${errorPath.at(-1)}.`,
          {
            status: 400,
            debugCtx: { apiName, type },
          },
        );
      }
      throw new UserFacingError('Received invalid data.', 400);
    }

    ErrorLogger.error(
      new Error(`${ucFirst(apiName)} ${type}: ${
        errParts.length
          ? errParts.join(' ')
          : 'unknown error'
      }.`),
      { ctx: 'apiValidateFn', apiName },
    );
    throw new UserFacingError('Unknown server error.', 500);
  }
}

import type { ValidateFunction } from 'ajv';

import ucFirst from 'lib/ucFirst';

export default async function validateApiData(
  type: 'params' | 'data',
  validateFn: ValidateFunction,
  data: any,
) {
  if (!await validateFn(data)) {
    const error = validateFn.errors?.[0];
    const dataPath = error?.instancePath?.replace(/^[^A-Za-z]/, '');
    if (error && dataPath && type === 'params') {
      throw new HandledError(
        `${ucFirst(dataPath)} ${error.message}`,
        400,
      );
    }
    throw new HandledError(
      `Unknown API ${type} error.`,
      500,
      error ? { dataPath, error } : null,
    );
  }
}

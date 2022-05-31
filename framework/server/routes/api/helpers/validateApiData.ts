import type { ValidateFunction } from 'ajv';

import ucFirst from 'utils/ucFirst';

export default function validateApiData(
  type: 'params' | 'data',
  validateFn: ValidateFunction,
  data: any,
) {
  if (!validateFn(data)) {
    const error = validateFn.errors?.[0];
    const dataPath = error?.instancePath?.replace(/^[^A-Za-z]/, '');
    if (error?.message && dataPath && type === 'params') {
      throw new HandledError(
        `${ucFirst(dataPath)} ${error.message.toLowerCase()}`,
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

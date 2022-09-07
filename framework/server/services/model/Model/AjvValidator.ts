import type { ValidatorArgs } from 'objection';
import type { ValidateFunction, ErrorObject } from 'ajv';
import { Validator } from 'objection';
import at from 'lodash/at';
import trim from 'lodash/trim';

import ajv from 'services/ajv';

function formatError(error: ErrorObject | undefined, Model: ModelClass): string {
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
  }
  if (error?.keyword === 'additionalProperties' && error?.params.additionalProperty) {
    debugErrParts.push(`"${error.params.additionalProperty}"`);
  }
  if (!debugErrParts.length) {
    debugErrParts.push('invalid value');
  }
  return `${Model.name}: ${debugErrParts.join(' ')}.`;
}

export default class AjvValidator extends Validator {
  Model: ModelClass;
  validator: ValidateFunction;
  patchValidator: ValidateFunction;

  constructor(Model: ModelClass) {
    super();

    this.Model = Model;
    this.validator = ajv.compile(Model.jsonSchema);
    this.patchValidator = ajv.compile({ ...Model.jsonSchema, required: [] });
  }

  override validate({ json, options }: ValidatorArgs) {
    const validator = options.patch ? this.patchValidator : this.validator;

    if (!validator(json)) {
      const rc = getRC();
      const error = validator.errors?.[0];
      // todo: low/mid add context for Bull queues
      if (rc?.debug || (!process.env.PRODUCTION && !rc)) {
        if (error) {
          printDebug(error, 'error');
          if (error.instancePath) {
            const instancePath = trim(error.instancePath, '/').replaceAll('/', '.');
            const pathVal = at<any>(json, [instancePath])[0];
            // eslint-disable-next-line no-console
            console.log(json);
            printDebug(
              'Instance value',
              'error',
              `${pathVal} (${typeof pathVal})`,
            );
          }
        } else {
          printDebug(validator.errors, 'error');
        }
      }

      throw new Error(formatError(error, this.Model));
    }

    return json;
  }
}

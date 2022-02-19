import type { ValidatorArgs } from 'objection';
import type { ValidateFunction, ErrorObject } from 'ajv';
import { Validator } from 'objection';
import at from 'lodash/at';
import trim from 'lodash/trim';

import ajv from 'lib/ajv';

// todo: mid/mid combine with validateApiData and log failures
function formatError(error: ErrorObject, Model: ModelClass): string {
  const dataPath = error.instancePath.replace(/^[^A-Za-z]/, '');
  const field = dataPath ? `${Model.name}'s ${dataPath}` : `${Model.name}`;
  if (error.message) {
    let msg = `${field} ${error.message.toLowerCase()}`;
    if (error.keyword === 'additionalProperties' && error.params.additionalProperty) {
      msg += ` "${error.params.additionalProperty}"`;
    }
    return msg;
  }
  return `Invalid value for ${field}`;
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
      if (error) {
        // todo: low/mid add context for Bull queues
        if (rc?.debug || !rc) {
          printDebug(error, 'error');
          if (error.instancePath) {
            const instancePath = trim(error.instancePath, '/').replaceAll('/', '.');
            const pathVal = at<any>(json, [instancePath])[0];
            // eslint-disable-next-line no-console
            console.log(json);
            printDebug(
              `Instance value`,
              'error',
              `${pathVal} (${typeof pathVal})`,
            );
          }
        }
        throw new Error(formatError(error, this.Model));
      }

      if (rc?.debug || !rc) {
        printDebug(validator.errors, 'error');
      }
      throw new Error(`Unknown error when validating ${this.Model.name}`);
    }

    return json;
  }
}

import type { ValidatorArgs, Pojo } from 'objection';
import type { ValidateFunction, ErrorObject } from 'ajv';
import { Validator } from 'objection';
import at from 'lodash/at.js';
import trim from 'lodash/trim.js';

import getAjv from 'services/getAjv';

function getAjvError(Model: ModelClass, obj: JsonObj, err: ErrorObject): Error {
  const errorPath = err.instancePath
    ?.replace(/^[^/A-Za-z]/, '')
    .split('/')
    .filter(Boolean);
  const debugErrParts: string[] = [];
  if (errorPath?.length) {
    debugErrParts.push(`${errorPath.join('.')}`);
  }
  if (err.message) {
    debugErrParts.push(`${err.message.toLowerCase()}`);
  }
  if (err.keyword === 'additionalProperties' && err.params.additionalProperty) {
    debugErrParts.push(`"${err.params.additionalProperty}"`);
  }
  if (!debugErrParts.length) {
    debugErrParts.push('invalid value');
  }

  const instancePath = trim(err.instancePath, '/').replaceAll('/', '.');
  const instanceVal = at<any>(obj, [instancePath])[0];
  return getErr(
    `${Model.name}: ${debugErrParts.join(' ')}`,
    instancePath
      ? {
        instancePath: err.instancePath,
        instanceVal,
      }
      : {},
  );
}

export default class AjvValidator extends Validator {
  Model: ModelClass;
  validator: ValidateFunction<IBaseModel>;
  patchValidator: ValidateFunction<IBaseModel>;

  constructor(Model: ModelClass) {
    super();

    this.Model = Model;
    const ajv = getAjv();
    this.validator = ajv.compile(Model.jsonSchema);
    this.patchValidator = ajv.compile({ ...Model.jsonSchema, required: [] });
  }

  override validate({ json, options }: ValidatorArgs): Pojo {
    const validator = options.patch ? this.patchValidator : this.validator;

    if (!validator(json)) {
      const rc = getRC();
      const error = validator.errors?.[0];
      if (!process.env.PRODUCTION && (!rc || rc?.debug)) {
        if (error) {
          printDebug(error, 'error');
          if (error.instancePath) {
            const instancePath = trim(error.instancePath, '/').replaceAll('/', '.');
            const instanceVal = at<any>(json, [instancePath])[0];
            // eslint-disable-next-line no-console
            printDebug(
              'Instance value',
              'error',
              {
                ctx: `${instanceVal}: ${typeof instanceVal}`,
                details: JSON.stringify(json),
              },
            );
          }
        } else {
          printDebug(validator.errors, 'error');
        }
      }

      throw error
        ? getAjvError(this.Model, json, error)
        : new Error(`${this.Model.type}: unknown AJV error`);
    }

    return json;
  }
}

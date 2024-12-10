import BaseModel from 'core/models/Model/BaseModel';
import getPartialUniqueIndex from 'utils/models/getPartialUniqueIndex';

export default function validateNonUniquePartial<T extends ModelClass>(
  Model: T,
  partial: ModelPartial<T>,
): boolean {
  if (!process.env.PRODUCTION && partial instanceof BaseModel) {
    throw new Error(`validateNonUniquePartial(${Model.type}): partial is a model instance.`);
  }

  if (getPartialUniqueIndex(Model, partial)) {
    throw getErr(
      `validateNonUniquePartial(${Model.type}): can't use unique partial`,
      { keys: Object.keys(partial) },
    );
  }

  for (const kv of Object.entries(partial)) {
    if (kv[1] === undefined) {
      if (!process.env.PRODUCTION) {
        ErrorLogger.warn(
          new Error(`validateNonUniquePartial(${Model.type}): partial has undefined value`),
          { partial },
        );
      }
      return false;
    }
  }
  return true;
}

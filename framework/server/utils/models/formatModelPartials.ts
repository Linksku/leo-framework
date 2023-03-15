import { serializeDateProps, unserializeDateProps } from './dateSchemaHelpers';

// For Node -> cache/DB/APIs
export function formatModelPojo<T extends ModelClass>(
  Model: T,
  obj: ModelPartial<T>,
  opts?: {
    forDb?: boolean,
    inPlace?: boolean,
  },
): ModelPartial<T> {
  const fullSchema = Model.getSchema();

  const newObj: ModelPartial<T> = opts?.inPlace ? obj : {};
  for (const k of TS.objKeys(fullSchema)) {
    if (TS.hasProp(obj, k)) {
      newObj[k] = obj[k];
    }
  }
  serializeDateProps(fullSchema, newObj, opts?.forDb ?? false);

  return newObj;
}

// For cache/DB -> Node
export function parseModel<T extends ModelClass>(
  Model: T,
  obj: ModelPartial<T>,
  opts?: {
    inPlace?: boolean,
  },
): ModelPartial<T> {
  const newObj: ModelPartial<T> = opts?.inPlace ? obj : { ...obj };
  unserializeDateProps(Model.getSchema(), newObj);

  return newObj;
}

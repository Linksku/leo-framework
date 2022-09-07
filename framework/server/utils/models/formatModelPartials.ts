import { serializeDateProp, unserializeDateProp } from './dateSchemaHelpers';

// For Node -> cache/DB
export function formatModel<T extends ModelClass>(
  Model: T,
  obj: ModelPartial<T>,
  opts?: {
    forDb?: boolean,
    inPlace?: boolean,
  },
): ModelPartial<T> {
  const fullSchema = Model.getSchema();

  const newObj: ModelPartial<T> = opts?.inPlace ? obj : {};
  for (const [k, schema] of TS.objEntries(fullSchema)) {
    if (!TS.hasProp(obj, k)) {
      continue;
    }

    newObj[k] = serializeDateProp(schema, obj[k], opts?.forDb ?? false);
  }

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
  const schema = Model.getSchema();

  const newObj: ModelPartial<T> = opts?.inPlace ? obj : {};
  for (let [k, v] of TS.objEntries(obj)) {
    if (!schema[k]) {
      continue;
    }

    v = unserializeDateProp(schema[k], v);

    newObj[k] = v;
  }

  return newObj;
}

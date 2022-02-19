import omit from 'lodash/omit';

import { serializeDateProp, unserializeDateProp } from './dateSchemaHelpers';

function formatValue(schema: JSONSchema, val: any, forDb: boolean): any {
  val = serializeDateProp(schema, val, forDb);

  if (val instanceof Buffer) {
    val = val.toString('utf8').replace(/\0/g, '');
  }

  return val;
}

// For Node -> cache
export function formatModel<T extends ModelClass>(
  Model: T,
  obj: ModelPartial<T>,
): ModelPartial<T> {
  const fullSchema = Model.getSchema();

  const newObj: ModelPartial<T> = {};
  for (const [k, schema] of TS.objEntries(fullSchema)) {
    if (!TS.hasProp(obj, k)) {
      continue;
    }

    newObj[k] = formatValue(schema, obj[k], false);
  }

  return newObj;
}

// For cache -> Node
export function parseModel<T extends ModelClass>(
  Model: T,
  obj: ModelPartial<T>,
): ModelPartial<T> {
  const schema = Model.getSchema();

  const newObj: ModelPartial<T> = {};
  for (let [k, v] of TS.objEntries(obj)) {
    if (!schema[k]) {
      continue;
    }

    v = unserializeDateProp(schema[k], v);

    newObj[k] = v;
  }

  return newObj;
}

export function formatModelForApi<T extends ModelClass>(
  Model: T,
  obj: ModelPartial<T>,
): ModelPartial<T> & { type: ModelType, extras: ObjectOf<any> | undefined } {
  const formatted = formatModel(Model, obj);
  return {
    ...omit(formatted, ['version']),
    type: Model.type,
    // @ts-ignore wontfix key error
    extras: obj.extras,
  };
}

export function formatModelPartialForDb<T extends ModelClass>(
  Model: T,
  obj: ModelPartial<T>,
): ModelPartial<T> {
  const fullSchema = Model.getSchema();

  for (const [k, schema] of TS.objEntries(fullSchema)) {
    if (!TS.hasProp(obj, k)) {
      continue;
    }

    obj[k] = formatValue(schema, obj[k], true);
  }

  return obj;
}

export function parseModelPartialFromDb<T extends ModelClass>(
  Model: T,
  obj: ModelPartial<T>,
): ModelPartial<T> {
  const schema = Model.getSchema();

  for (let [k, v] of TS.objEntries(obj)) {
    if (!schema[k]) {
      continue;
    }

    v = unserializeDateProp(schema[k], v);

    obj[k] = v;
  }

  return obj;
}

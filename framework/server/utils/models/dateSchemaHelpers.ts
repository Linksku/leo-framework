import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';

import { toDbDateTime } from 'utils/db/dbDate';

export function isPropDate(schema: JSONSchema): boolean {
  if (TS.getProp(schema, 'instanceof') === 'Date') {
    return true;
  }

  if (schema.anyOf) {
    return schema.anyOf.some(v => TS.getProp(v, 'instanceof') === 'Date');
  }

  if (schema.oneOf) {
    return schema.oneOf.some(v => TS.getProp(v, 'instanceof') === 'Date');
  }

  return false;
}

// Must mutate input obj for $beforeValidate.
export function serializeDateProp(
  schema: JSONSchema,
  _val: any,
  forDb: boolean,
): any {
  if (_val != null
    && (_val instanceof Date || _val instanceof dayjs)
    && isPropDate(schema)) {
    const val = _val as Date | Dayjs;

    if (forDb) {
      return toDbDateTime(val);
    }
    return val.toISOString();
  }
  return _val;
}

export function serializeDateProps(
  fullSchema: JSONSchema,
  obj: ObjectOf<any>,
  forDb: boolean,
): ObjectOf<any> {
  if (!fullSchema.properties) {
    throw new Error('serializeDateProps: invalid schema');
  }

  for (const [k, schema] of Object.entries(fullSchema.properties)) {
    if (typeof schema !== 'boolean') {
      obj[k] = serializeDateProp(schema, obj[k], forDb);
    }
  }
  return obj;
}

export function unserializeDateProp(schema: JSONSchema, val: any): any {
  if (val != null && isPropDate(schema)) {
    return dayjs(val).toDate();
  }
  return val;
}

export function unserializeDateProps(
  fullSchema: JSONSchema,
  obj: ObjectOf<any>,
): ObjectOf<any> {
  if (!fullSchema.properties) {
    throw new Error('unserializeDateProps: invalid schema');
  }

  for (const [k, schema] of Object.entries(fullSchema.properties)) {
    if (typeof schema !== 'boolean') {
      obj[k] = unserializeDateProp(schema, obj[k]);
    }
  }
  return obj;
}

export function getDateProps(fullSchema: ObjectOf<JSONSchema>) {
  return Object.entries(fullSchema)
    .filter(entry => entry[1] && isPropDate(entry[1]))
    .map(entry => entry[0]);
}

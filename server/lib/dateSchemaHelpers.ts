import type { Dayjs } from 'dayjs';

import { toMysqlDateTime, toMysqlDate } from 'lib/mysqlDate';

export function isPropDate(schema: JSONSchema, prop: PropertyKey): boolean {
  if (typeof prop !== 'string') {
    return false;
  }

  const desc = schema.properties?.[prop];
  return typeof desc === 'object'
    && (
      desc.type === 'string'
      || (Array.isArray(desc.type) && desc.type.includes('string'))
    )
    && !!desc.format
    && ['date', 'date-time', 'mysql-date-time'].includes(desc.format);
}

// Must mutate input obj.
export function serializeDateProp(schema: JSONSchema, prop: PropertyKey, val: any, forDb: boolean) {
  if (val != null && typeof prop === 'string' && isPropDate(schema, prop)) {
    const desc = schema.properties?.[prop];
    if (typeof desc === 'object' && (val instanceof Date || val instanceof dayjs)) {
      if (desc.format === 'date') {
        return toMysqlDate(val as Date | Dayjs);
      }
      if (desc.format === 'date-time' || desc.format === 'mysql-date-time') {
        if (forDb) {
          return toMysqlDateTime(val as Date | Dayjs);
        }
        return (val as Date | Dayjs).toISOString();
      }
    }
  }
  return val;
}

export function serializeDateProps<T extends ObjectOf<any>>(
  schema: JSONSchema,
  obj: T,
  forDb: boolean,
) {
  for (const [k, v] of TS.objectEntries(obj)) {
    obj[k] = serializeDateProp(schema, k, v, forDb);
  }
  return obj;
}

export function unserializeDateProp(schema: JSONSchema, prop: PropertyKey, val: any) {
  if (val != null && isPropDate(schema, prop)) {
    return dayjs(val).toDate();
  }
  return val;
}

export function unserializeDateProps<T extends ObjectOf<any>>(schema: JSONSchema, obj: T) {
  for (const [k, v] of TS.objectEntries(obj)) {
    obj[k] = unserializeDateProp(schema, k, v);
  }
  return obj;
}

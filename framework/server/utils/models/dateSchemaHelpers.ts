import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';

import { toDbDateTime } from 'utils/db/dbDate';

export function isPropDate(schema: JsonSchema): boolean {
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

const memo: Map<JsonSchemaProperties, Set<string>> = new Map();
export function getDateProps(schema: JsonSchemaProperties): Set<string> {
  if (!memo.has(schema)) {
    memo.set(
      schema,
      new Set(
        Object.entries(schema)
          .filter(entry => entry[1] && isPropDate(entry[1]))
          .map(entry => entry[0]),
      ),
    );
  }
  return memo.get(schema) as Set<string>;
}

// Must mutate input obj for $beforeValidate.
export function serializeDateProp(
  schema: JsonSchemaProperties,
  key: string,
  val: any,
  forDb: boolean,
): any {
  if (val != null
    && (val instanceof Date || val instanceof dayjs)
    && getDateProps(schema).has(key)) {
    const val2 = val as Date | Dayjs;
    return forDb
      ? toDbDateTime(val2)
      : val2.toISOString();
  }
  return val;
}

export function serializeDateProps(
  schema: JsonSchemaProperties,
  obj: ObjectOf<any>,
  forDb: boolean,
): ObjectOf<any> {
  const dateProps = getDateProps(schema);
  for (const key of dateProps) {
    const val = obj[key] as Date | Dayjs | undefined;
    if (val) {
      obj[key] = forDb
        ? toDbDateTime(val)
        : val.toISOString();
    }
  }
  return obj;
}

export function unserializeDateProp(
  schema: JsonSchemaProperties,
  key: string,
  val: any,
): any {
  if (val != null && getDateProps(schema).has(key) && val != null) {
    return dayjs(val).toDate();
  }
  return val;
}

export function unserializeDateProps(
  schema: JsonSchemaProperties,
  obj: ObjectOf<any>,
): ObjectOf<any> {
  const dateProps = getDateProps(schema);
  for (const key of dateProps) {
    const val = obj[key] as Nullish<Date | Dayjs>;
    if (val != null) {
      obj[key] = dayjs(val).toDate();
    }
  }
  return obj;
}

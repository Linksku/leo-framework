import type { JSONSchema, ModelOptions } from 'objection';
import type { Dayjs } from 'dayjs';
import { AjvValidator } from 'objection';

import { toMysqlDateTime, toMysqlDate } from 'lib/mysqlDate';

import EntityComputed from './EntityComputed';

const MYSQL_DATE_TIME_REGEX = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/;

export function isPropDate(schema: JSONSchema, prop: string): boolean {
  const desc = schema.properties?.[prop];
  return typeof desc === 'object'
    && (
      (Array.isArray(desc.type) && desc.type.includes('string'))
      || desc.type === 'string'
    )
    && !!desc.format
    && ['date', 'date-time', 'mysql-date-time'].includes(desc.format);
}

export function unserializeDbProp(schema: JSONSchema, prop: string, val: any) {
  if (isPropDate(schema, prop)) {
    return dayjs(val);
  }
  return val;
}

export function serializeJsonProp(schema: JSONSchema, prop: string, val: any) {
  if (isPropDate(schema, prop)) {
    return dayjs(val).toISOString();
  }
  return val;
}

export function serializeDbProp(schema: JSONSchema, prop: string, val: any) {
  if (isPropDate(schema, prop)) {
    const desc = schema.properties?.[prop];
    if (typeof desc === 'object' && (val instanceof Date || val instanceof dayjs)) {
      if (desc.format === 'date') {
        return toMysqlDate(val as Date | Dayjs);
      }
      if (desc.format === 'date-time') {
        return (val as Date | Dayjs).toISOString();
      }
      if (desc.format === 'mysql-date-time') {
        return toMysqlDateTime(val as Date | Dayjs);
      }
    }
  }
  return val;
}

export default class EntityDates extends EntityComputed {
  static createValidator() {
    return new AjvValidator({
      onCreateAjv(ajv) {
        ajv.addFormat('mysql-date-time', str => MYSQL_DATE_TIME_REGEX.test(str));
      },
    });
  }

  // db -> node
  $parseDatabaseJson(obj: ObjectOf<any>): ObjectOf<any> {
    obj = super.$parseDatabaseJson(obj);

    const schema = (this.constructor as typeof Entity).dbJsonSchema;
    for (const k of Object.keys(schema.properties)) {
      obj[k] = unserializeDbProp(schema, k, obj[k]);
    }

    return obj;
  }

  // node -> json
  $formatJson(obj: ObjectOf<any>): ObjectOf<any> {
    obj = super.$formatJson(obj);
    const schema = (this.constructor as typeof Entity).allJsonSchema;
    for (const k of Object.keys(schema)) {
      obj[k] = serializeJsonProp(schema, k, obj[k]);
    }
    return obj;
  }

  $beforeValidate(schema: JSONSchema, obj: ObjectOf<any>, opts: ModelOptions) {
    schema = super.$beforeValidate(schema, obj, opts);
    if (!schema.properties) {
      return schema;
    }

    for (const k of Object.keys(schema.properties)) {
      obj[k] = serializeDbProp(schema, k, obj[k]);
    }

    return schema;
  }
}

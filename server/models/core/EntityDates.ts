import type { JSONSchema, ModelOptions } from 'objection';
import { AjvValidator } from 'objection';

import { toMysqlDateTime } from 'lib/mysqlDate';

import EntityComputed from './EntityComputed';

const MYSQL_DATE_TIME_REGEX = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/;

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

    const { properties } = (this.constructor as typeof Entity).jsonSchema;
    for (const k of Object.keys(properties)) {
      if (properties[k].type === 'string'
        && ['date', 'date-time', 'mysql-date-time'].includes(properties[k].format)) {
        obj[k] = dayjs(obj[k]);
      }
    }

    return obj;
  }

  // node -> json
  $formatJson(obj: ObjectOf<any>): ObjectOf<any> {
    obj = super.$formatJson(obj);
    const { properties } = (this.constructor as typeof Entity).jsonSchema;
    for (const k of Object.keys(properties)) {
      if (properties[k].type === 'string'
        && ['date', 'date-time', 'mysql-date-time'].includes(properties[k].format)) {
        obj[k] = dayjs(obj[k]).toISOString();
      }
    }
    return obj;
  }

  $beforeValidate(schema: JSONSchema, obj: ObjectOf<any>, opts: ModelOptions) {
    schema = super.$beforeValidate(schema, obj, opts);
    if (!schema.properties) {
      return schema;
    }

    for (const k of Object.keys(schema.properties)) {
      const desc = schema.properties[k];
      if (typeof desc === 'object'
        && desc.type === 'string'
        && (obj[k] instanceof Date || obj[k] instanceof dayjs)) {
        if (desc.format === 'mysql-date-time') {
          obj[k] = toMysqlDateTime(obj[k]);
        } else if (desc.format === 'date-time') {
          obj[k] = obj[k].toISOString();
        }
      }
    }

    return schema;
  }
}

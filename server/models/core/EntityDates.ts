import type { JSONSchema, ModelOptions } from 'objection';
import { AjvValidator } from 'objection';

import { unserializeDateProps, serializeDateProps } from 'lib/dateSchemaHelpers';

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

    const schema = (this.constructor as typeof Entity).dbJsonSchema;
    return unserializeDateProps(schema, obj);
  }

  // node -> json
  $formatJson(obj: ObjectOf<any>): ObjectOf<any> {
    obj = super.$formatJson(obj);
    const schema = (this.constructor as typeof Entity).allJsonSchema;
    return serializeDateProps(schema, obj, false);
  }

  $beforeValidate(schema: JSONSchema, obj: ObjectOf<any>, opts: ModelOptions) {
    schema = super.$beforeValidate(schema, obj, opts);
    if (!schema.properties) {
      return schema;
    }

    serializeDateProps(schema, obj, true);

    return schema;
  }
}

import type { ModelOptions } from 'objection';
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

  // db/redis/api -> node
  $parseJson(obj: ObjectOf<any>): ObjectOf<any> {
    obj = super.$parseJson(obj);

    const schema = (this.constructor as typeof Entity).allJsonSchema;
    return unserializeDateProps(schema, obj);
  }

  // node -> db
  $formatDatabaseJson(obj: Pojo): Pojo {
    obj = super.$formatDatabaseJson(obj);
    const schema = (this.constructor as typeof Entity).allJsonSchema;
    // todo: low/mid obj should already be serialized by $beforeValidate
    return serializeDateProps(schema, obj, true);
  }

  // node -> redis/api
  $formatJson(obj: Pojo): Pojo {
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

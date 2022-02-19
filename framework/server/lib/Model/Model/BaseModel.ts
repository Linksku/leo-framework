import type { JSONSchemaDefinition } from 'objection';
import { Model } from 'objection';

import {
  formatModel,
  formatModelForApi,
  formatModelPartialForDb,
  parseModel,
  parseModelPartialFromDb,
} from 'lib/modelUtils/formatModelPartials';
import AjvValidator from './AjvValidator';
import CustomQueryBuilder from './CustomQueryBuilder';

function hasDefault(val: JSONSchema): boolean {
  if (typeof val === 'boolean') {
    return false;
  }
  if (val.anyOf) {
    return val.anyOf.some(v => hasDefault(v));
  }
  if (val.allOf) {
    return val.allOf.every(v => hasDefault(v));
  }
  if (Array.isArray(val.type) && val.type.includes('null')) {
    return true;
  }
  if (TS.hasProp(val, 'default')) {
    return true;
  }

  return false;
}

class BaseModel extends Model implements IBaseModel {
  static type: ModelType;

  static Interface: IBaseModel;

  static isMV: boolean;

  static cacheable = false;

  // todo: mid/hard validate json schema against mysql
  static schema = {} as ModelSchema<IBaseModel>;

  static getSchema<T extends ModelClass>(this: T): ModelSchema<T['Interface']> {
    return this.schema as ModelSchema<T['Interface']>;
  }

  // Relies on Objection to add quotes
  static get cols(): ModelColsMap<IBaseModel> {
    const cols: ObjectOf<string> = {
      all: `${this.tableName}.*`,
    };
    for (const prop of Object.keys(this.schema)) {
      cols[prop] = `${this.tableName}.${prop}`;
    }
    return cols as ModelColsMap<IBaseModel>;
  }

  static get colsQuoted(): ModelColsMap<IBaseModel> {
    const cols: ObjectOf<string> = {
      all: `"${this.tableName}".*`,
    };
    for (const prop of Object.keys(this.schema)) {
      cols[prop] = `"${this.tableName}"."${prop}"`;
    }
    return cols as ModelColsMap<IBaseModel>;
  }

  static uniqueIndexes: (string | string[])[] = ['id'];

  static normalIndexes: (string | string[])[] = [];

  static getUniqueIndexes<T extends ModelClass>(this: T): ModelIndex<T>[] {
    return this.uniqueIndexes as ModelIndex<T>[];
  }

  static getNormalIndexes<T extends ModelClass>(this: T): ModelIndex<T>[] {
    return this.normalIndexes as ModelIndex<T>[];
  }

  static getIdColumn<T extends ModelClass>(this: T): ModelIndex<T> {
    return this.idColumn as ModelIndex<T>;
  }

  /*
  Start Objection fields
  */

  static override get idColumn() {
    if (!this.uniqueIndexes.length) {
      throw new Error(`${this.name}.idColumn: no unique indexes.`);
    }
    return this.uniqueIndexes[0];
  }

  static override get jsonSchema() {
    const required: string[] = [];
    for (const [prop, val] of TS.objEntries(this.schema)) {
      if (
        (prop as string !== 'id' && !hasDefault(val as JSONSchema))
        || this.isMV
      ) {
        required.push(prop);
      }
    }

    return {
      type: 'object',
      required,
      properties: this.schema as Record<string, JSONSchemaDefinition>,
      additionalProperties: false,
    };
  }

  static override pickJsonSchemaProperties = true;

  static override useLimitInFirst = true;

  /*
  TS runs much faster when QueryBuilderType is an interface extending the base QueryBuilder
  rather than a class
  */
  declare QueryBuilderType: QueryBuilder<this>;
  static override QueryBuilder = CustomQueryBuilder;

  static override createValidator<T extends ModelClass>(this: T) {
    return new AjvValidator(this);
  }

  /*
  End Objection fields
  */

  constructor(..._args: any[]) {
    super();
  }

  declare __isModel: true;

  // todo: mid/hard get rid of extras and put everything in models or cache
  declare extras?: ObjectOf<any>;

  /*
  To/from Pojo

  $toJson: may have Date, Buffer, etc

  $toDatabaseJson: may have Knex.raw

  $toCacheJson: Pojo, no extras/type

  $toApiJson: Pojo, with extras/type, may have fields removed
  */

  override $parseDatabaseJson(obj: ObjectOf<any>): ObjectOf<any> {
    obj = super.$parseDatabaseJson(obj);
    return parseModelPartialFromDb(this.constructor as ModelClass, obj);
  }

  override $formatDatabaseJson(obj: ObjectOf<any>): ObjectOf<any> {
    obj = super.$formatDatabaseJson(obj);
    return formatModelPartialForDb(this.constructor as ModelClass, obj);
  }

  static fromCacheJson<T extends ModelClass>(this: T, obj: ObjectOf<any>): InstanceType<T> {
    const instance = new this() as InstanceType<T>;
    instance.$setJson(instance.$parseCacheJson(obj), { skipValidation: true });
    return instance;
  }

  $parseCacheJson(obj: ObjectOf<any>): ObjectOf<any> {
    return parseModel(
      this.constructor as ModelClass,
      obj,
    );
  }

  $formatCacheJson(obj: ObjectOf<any>): ObjectOf<any> {
    return formatModel(
      this.constructor as ModelClass,
      obj,
    );
  }

  $toCacheJson(): ObjectOf<Primitive> {
    const obj = this.$formatCacheJson(this.toJSON({ shallow: true }));

    if (process.env.NODE_ENV !== 'production') {
      for (const [k, v] of TS.objEntries(obj)) {
        if (!obj[k]
            && (v instanceof BaseModel || (Array.isArray(v) && v.length))) {
          throw new Error(`${(this.constructor as ModelClass).type}.$toCacheJson: removing prop ${k}`);
        }
      }
    }

    return obj;
  }

  $formatApiJson(obj: ObjectOf<any>) {
    return formatModelForApi(
      this.constructor as ModelClass,
      obj,
    );
  }

  getId(): number | string {
    throw new Error(`${this.constructor.name}.getId: not implemented`);
  }

  $toApiJson(): ModelSerializedForApi {
    return {
      ...this.$formatApiJson(this.toJSON({ shallow: true })),
      id: this.getId(),
    };
  }
}

export default BaseModel;

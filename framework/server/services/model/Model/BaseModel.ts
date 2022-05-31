import type { JSONSchemaDefinition } from 'objection';
import { Model as ObjectionModel } from 'objection';

import {
  formatModel,
  formatModelForApi,
  formatModelPartialForDb,
  parseModel,
  parseModelPartialFromDb,
} from 'utils/models/formatModelPartials';
import isSchemaNullable from 'utils/models/isSchemaNullable';
import { RelationsConfig, getRelationsMap } from '../helpers/modelRelations';
import AjvValidator from './AjvValidator';
import CustomQueryBuilder from './CustomQueryBuilder';

function hasDefault(val: JSONSchema): boolean {
  if (typeof val === 'boolean') {
    return false;
  }
  if (isSchemaNullable(val)) {
    return true;
  }
  if (TS.hasProp(val, 'default')) {
    return true;
  }
  if (val.anyOf) {
    return val.anyOf.some(v => hasDefault(v));
  }
  if (val.allOf) {
    return val.allOf.every(v => hasDefault(v));
  }

  return false;
}

// todo: low/hard remove Objection
class BaseModel extends ObjectionModel implements IBaseModel {
  static type: ModelType;

  static Interface: IBaseModel;

  static instanceType: Model;

  static isMV: boolean;

  static cacheable: boolean;

  static getReplicaTable(): string | null {
    return this.tableName;
  }

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

  static as<T extends ModelClass>(this: T, name: string): ModelColsMap<ModelTypeToInterface<T['type']>> {
    const cols: ObjectOf<string> = {
      all: `${name}.*`,
    };
    for (const prop of Object.keys(this.schema)) {
      cols[prop] = `${name}.${prop}`;
    }
    return cols as ModelColsMap<ModelTypeToInterface<T['type']>>;
  }

  static asQuoted<T extends ModelClass>(this: T, name: string): ModelColsMap<ModelTypeToInterface<T['type']>> {
    const cols: ObjectOf<string> = {
      all: `"${name}".*`,
    };
    for (const prop of Object.keys(this.schema)) {
      cols[prop] = `"${name}"."${prop}"`;
    }
    return cols as ModelColsMap<ModelTypeToInterface<T['type']>>;
  }

  static uniqueIndexes: (string | string[])[] = [];

  static normalIndexes: (string | string[])[] = [];

  static expressionIndexes: string[] = [];

  static getPrimaryKey<T extends ModelClass>(this: T): ModelIndex<T> {
    if (!this.uniqueIndexes.length) {
      throw new Error(`${this.type}.getPrimaryKey: no unique indexes.`);
    }
    return this.getUniqueIndexes()[0];
  }

  // todo: low/easy turn methods into accessors or memoize
  static getUniqueIndexes<T extends ModelClass>(this: T): ModelIndex<T>[] {
    return this.uniqueIndexes.map(idx => (Array.isArray(idx) ? idx : [idx])) as ModelIndex<T>[];
  }

  static getNormalIndexes<T extends ModelClass>(this: T): ModelIndex<T>[] {
    return this.normalIndexes.map(idx => (Array.isArray(idx) ? idx : [idx])) as ModelIndex<T>[];
  }

  static getIdColumn<T extends ModelClass>(this: T): ModelIndex<T> {
    return this.idColumn as ModelIndex<T>;
  }

  static relations: RelationsConfig = {};

  static get relationsMap() {
    return getRelationsMap(this as ModelClass, this.relations);
  }

  /*
  Start Objection fields
  */

  static override get tableName(): string {
    return this.type;
  }

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

  static override virtualAttributes = [
    'extras',
    'relations',
  ];

  /*
  TS runs much faster when QueryBuilderType is an interface extending the base QueryBuilder
  rather than a class
  */
  // declare QueryBuilderType: QueryBuilder<this>;
  static override QueryBuilder = (CustomQueryBuilder as any);

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

  declare cls: ModelClass;

  // todo: mid/hard get rid of extras and put everything in models or cache
  declare extras?: ObjectOf<any>;

  declare relations?: ObjectOf<Model | Model[] | null>;

  /*
  To/from Pojo

  $toJson: may have Date, Buffer, etc

  $toDatabaseJson: may have Knex.raw

  $toCacheJson: Pojo, no extras/relations/type

  $toApiJson: Pojo, with extras/relations/type, may have fields removed
  */

  override $parseDatabaseJson(obj: ObjectOf<any>): ObjectOf<any> {
    obj = super.$parseDatabaseJson(obj);
    return parseModelPartialFromDb(this.constructor as ModelClass, obj);
  }

  override $formatDatabaseJson(obj: ObjectOf<any>): ObjectOf<any> {
    obj = super.$formatDatabaseJson(obj);
    return formatModelPartialForDb(this.constructor as ModelClass, obj);
  }

  static fromCacheJson<T extends ModelClass>(this: T, obj: ObjectOf<any>): ModelInstance<T> {
    return this.fromJson(
      parseModel(this, obj as Partial<T['Interface']>),
      { skipValidation: true },
    ) as ModelInstance<T>;
  }

  $toCacheJson(): ObjectOf<Primitive> {
    const obj: ObjectOf<any> = formatModel(
      this.constructor as ModelClass,
      this.$toJson({ shallow: true }),
    );

    if (!process.env.PRODUCTION) {
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

  getId(): ApiEntityId {
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

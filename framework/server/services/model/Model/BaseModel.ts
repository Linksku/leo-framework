import type { JSONSchemaDefinition } from 'objection';
import { Model as ObjectionModel } from 'objection';
import omit from 'lodash/omit';
import uniq from 'lodash/uniq';

import { formatModel, parseModel } from 'utils/models/formatModelPartials';
import modelInstanceToPojo from 'utils/models/modelInstanceToPojo';
import isSchemaNullable from 'utils/models/isSchemaNullable';
import deepFreezeIfDev from 'utils/deepFreezeIfDev';
import { ModelRelationsSpecs, getRelationsMap } from '../helpers/modelRelations';
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

  static expressionIndexes: ({
    cols: string[],
    col?: undefined,
    expression: string,
  } | {
    col: string,
    cols?: undefined,
    expression: string,
  })[] = [];

  static get primaryIndex() {
    if (!this.uniqueIndexes.length) {
      throw new Error(`${this.name}.primaryIndex: no unique indexes.`);
    }
    return this.uniqueIndexes[0];
  }

  // todo: low/easy turn methods into accessors or memoize
  static getUniqueIndexes<T extends ModelClass>(this: T): ModelIndex<T>[] {
    return this.uniqueIndexes.map(idx => (Array.isArray(idx) ? idx : [idx])) as ModelIndex<T>[];
  }

  static getNormalIndexes<T extends ModelClass>(this: T): ModelIndex<T>[] {
    return this.normalIndexes.map(idx => (Array.isArray(idx) ? idx : [idx])) as ModelIndex<T>[];
  }

  static getPrimaryIndex<T extends ModelClass>(this: T): ModelIndex<T> {
    return this.primaryIndex as ModelIndex<T>;
  }

  static relations: ModelRelationsSpecs = {};

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
    return this.primaryIndex;
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
    'includedRelations',
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

  declare includedRelations?: string[];

  getId(): ApiEntityId {
    throw new Error(`${this.constructor.name}.getId: not implemented`);
  }

  /*
  To/from Pojo

  $toJson: may have Date, Buffer, etc

  $toDatabaseJson: may have Knex.raw

  $toCacheJson: Pojo, no extras/relations/type

  $toApiJson: Pojo, with extras/relations/type, may have fields removed
  */

  override $toJson<T extends Model>(this: T, _opt: any) {
    return modelInstanceToPojo(this) as T['cls']['Interface'];
  }

  override toJSON<T extends Model>(this: T, _opt: any) {
    // low/mid deep freeze pojo after removing extras
    return modelInstanceToPojo(this) as T['cls']['Interface'];
  }

  override $parseDatabaseJson(obj: ObjectOf<any>): ObjectOf<any> {
    obj = super.$parseDatabaseJson(obj);
    return parseModel(this.constructor as ModelClass, obj, {
      inPlace: true,
    });
  }

  override $formatDatabaseJson(obj: ObjectOf<any>): ObjectOf<any> {
    obj = super.$formatDatabaseJson(obj);
    return formatModel(this.constructor as ModelClass, obj, {
      forDb: true,
      inPlace: true,
    });
  }

  static fromCacheJson<T extends ModelClass>(this: T, obj: ObjectOf<any>): ModelInstance<T> {
    return this.fromJson(
      parseModel(this, obj as Partial<T['Interface']>),
      { skipValidation: true },
    ) as ModelInstance<T>;
  }

  $toCacheJson<T extends Model>(this: T): ObjectOf<any> {
    return formatModel(
      this.constructor as ModelClass,
      modelInstanceToPojo(this),
    );
  }

  $formatApiJson<T extends Partial<IBaseModel>>(obj: T): T {
    return obj;
  }

  $toApiJson<T extends Model>(this: T): ModelSerializedForApi {
    const Model = this.constructor as T['cls'];
    const { extras, includedRelations } = this;

    const obj = modelInstanceToPojo(this);
    const formatted = formatModel(Model, obj);
    return deepFreezeIfDev(this.$formatApiJson({
      type: Model.type,
      id: this.getId(),
      ...omit(formatted, ['version']),
      ...(extras ? { extras } : null),
      ...(includedRelations ? { includedRelations: uniq(includedRelations) } : null),
    }));
  }
}

export default BaseModel;

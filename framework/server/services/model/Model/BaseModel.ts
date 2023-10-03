import type { JSONSchemaDefinition, ModelOptions } from 'objection';
import { Model as ObjectionModel } from 'objection';

import { formatModelPojo, parseModel } from 'utils/models/formatModelPartials';
import modelInstanceToPojo from 'utils/models/modelInstanceToPojo';
import isSchemaNullable from 'utils/models/isSchemaNullable';
import deepFreezeIfDev from 'utils/deepFreezeIfDev';
import { IS_PROFILING_API } from 'serverSettings';
import { ModelRelationsSpecs, getRelationsMap, ModelRelationsMap } from '../helpers/modelRelations';
import AjvValidator from './AjvValidator';
import CustomQueryBuilder from './CustomQueryBuilder';

type ModelJsonSchema = {
  type: 'object',
  required: string[],
  properties: Record<string, JSONSchemaDefinition>,
  additionalProperties: false,
};

function hasDefault(val: JsonSchema): boolean {
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

// todo: mid/hard remove Objection
class BaseModel extends ObjectionModel implements IBaseModel {
  static type: ModelType;

  static Interface: IBaseModel;

  static instanceType: Model;

  static isMV = false;

  static isVirtual = false;

  static cacheable: boolean;

  static getReplicaTable(): string | null {
    return this.tableName;
  }

  static schema = Object.create(null) as ModelSchema<IBaseModel>;

  static getSchema<T extends ModelClass>(this: T): ModelSchema<T['Interface']> {
    return this.schema as ModelSchema<T['Interface']>;
  }

  static _cols: ObjectOf<string> | undefined;

  // Relies on Objection to add quotes
  static get cols(): ModelColsMap<IBaseModel> {
    if (!this._cols) {
      const cols: ObjectOf<string> = {
        all: `${this.tableName}.*`,
      };
      for (const prop of Object.keys(this.schema)) {
        cols[prop] = `${this.tableName}.${prop}`;
      }
      this._cols = cols;
    }
    return this._cols as ModelColsMap<IBaseModel>;
  }

  static _colsQuoted: ObjectOf<string> | undefined;

  static get colsQuoted(): ModelColsMap<IBaseModel> {
    if (!this._colsQuoted) {
      const cols: ObjectOf<string> = {
        all: `"${this.tableName}".*`,
      };
      for (const prop of Object.keys(this.schema)) {
        cols[prop] = `"${this.tableName}"."${prop}"`;
      }
      this._colsQuoted = cols;
    }
    return this._colsQuoted as ModelColsMap<IBaseModel>;
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
    name?: string,
    cols: string[],
    col?: undefined,
    expression: string,
  } | {
    name?: string,
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

  static _uniqueIndexes: ModelIndex<ModelClass>[] | undefined;

  // todo: low/mid add memoize decorator
  static getUniqueIndexes<T extends ModelClass>(this: T): ModelIndex<T>[] {
    if (!this._uniqueIndexes) {
      this._uniqueIndexes = this.uniqueIndexes.map(
        idx => (Array.isArray(idx) ? idx : [idx]),
      ) as ModelIndex<ModelClass>[];
    }
    return this._uniqueIndexes as ModelIndex<T>[];
  }

  static _uniqueColumnsSet: Set<ModelKey<ModelClass>> | undefined;

  static getUniqueColumnsSet<T extends ModelClass>(this: T): Set<ModelKey<T>> {
    if (!this._uniqueColumnsSet) {
      this._uniqueColumnsSet = new Set(
        this.uniqueIndexes
          .map(idx => (
            Array.isArray(idx) && idx.length === 1 ? idx[0] : idx
          ) as ModelKey<ModelClass>)
          .filter(
            idx => !Array.isArray(idx) || idx.length === 1,
          ),
      );
    }
    return this._uniqueColumnsSet as Set<ModelKey<T>>;
  }

  static _normalIndexes: ModelIndex<ModelClass>[] | undefined;

  static getNormalIndexes<T extends ModelClass>(this: T): ModelIndex<T>[] {
    if (!this._normalIndexes) {
      this._normalIndexes = this.normalIndexes.map(
        idx => (Array.isArray(idx) ? idx : [idx]),
      ) as ModelIndex<ModelClass>[];
    }
    return this._normalIndexes as ModelIndex<T>[];
  }

  static getPrimaryIndex<T extends ModelClass>(this: T): ModelIndex<T> {
    return this.primaryIndex as ModelIndex<T>;
  }

  static relations: ModelRelationsSpecs = Object.create(null);

  static _relationsMap: ModelRelationsMap | undefined;

  static get relationsMap(): ModelRelationsMap {
    if (!this._relationsMap) {
      this._relationsMap = getRelationsMap(this as RRModelClass, this.relations);
    }
    return this._relationsMap;
  }

  static create<T extends ModelClass>(
    this: T,
    json: Partial<T['Interface']>,
    opt?: ModelOptions,
  ): ModelInstance<T> {
    return super.fromJson(json, opt) as ModelInstance<T>;
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

  static _jsonSchema: ModelJsonSchema | undefined;

  static override get jsonSchema(): ModelJsonSchema {
    if (!this._jsonSchema) {
      const required: string[] = [];
      for (const pair of TS.objEntries(this.schema)) {
        if (
          (pair[0] as string !== 'id' && !hasDefault(pair[1] as JsonSchema))
          || this.isMV
        ) {
          required.push(pair[0]);
        }
      }

      this._jsonSchema = {
        type: 'object',
        required,
        properties: this.schema as unknown as Record<string, JSONSchemaDefinition>,
        additionalProperties: false,
      };
    }
    return this._jsonSchema as ModelJsonSchema;
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
    return formatModelPojo(this.constructor as ModelClass, obj, {
      forDb: true,
      inPlace: true,
    });
  }

  static fromCacheJson<T extends ModelClass>(this: T, obj: ObjectOf<any>): ModelInstance<T> {
    obj = parseModel(this, obj as Partial<T['Interface']>);
    const ent = new this();
    for (const pair of TS.objEntries(obj)) {
      // @ts-ignore perf
      ent[pair[0]] = pair[1];
    }

    if (!process.env.PRODUCTION && !IS_PROFILING_API) {
      ent.$validate();
    }

    return ent;
  }

  $toCacheJson<T extends Model>(this: T): ObjectOf<any> {
    return formatModelPojo(
      this.constructor as ModelClass,
      modelInstanceToPojo(this, false),
    );
  }

  $formatApiJson<T extends Partial<IBaseModel>>(obj: T): T {
    return obj;
  }

  $toApiJson<T extends Model>(this: T): ModelSerializedForApi {
    const Model = this.constructor as RRModelClass;
    const { extras, includedRelations } = this;

    const obj = modelInstanceToPojo(this, false);
    const formatted = formatModelPojo<RRModelClass>(Model, obj);
    return deepFreezeIfDev(this.$formatApiJson({
      type: Model.type,
      id: this.getId(),
      ...formatted,
      ...(extras ? { extras } : null),
      ...(includedRelations ? { includedRelations: [...new Set(includedRelations)] } : null),
    }));
  }
}

export default BaseModel;

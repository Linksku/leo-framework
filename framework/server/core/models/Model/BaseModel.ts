import type { JSONSchemaDefinition, ModelOptions } from 'objection';
import { Model as ObjectionModel } from 'objection';
import omit from 'lodash/omit.js';

import { formatModelPojo, parseModel } from 'utils/models/formatModelPartials';
import modelInstanceToPojo from 'utils/models/modelInstanceToPojo';
import isSchemaNullable from 'utils/models/isSchemaNullable';
import deepFreezeIfDev from 'utils/deepFreezeIfDev';
import { IS_PROFILING_APIS } from 'config';
import getNonNullSchema from 'utils/models/getNonNullSchema';
import fastJson from 'services/fastJson';
import {
  ModelRelationsSpecs,
  getRelationsMap,
  ModelRelationsMap,
} from '../modelRelations';
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

  static isEntity = false;

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

  static _jsonStringify: (pojo: ObjectOf<any>) => string;

  // fast-json-stringify is ~half the time of JSON.stringify
  static stringify<T extends ModelClass>(this: T, pojo: ModelPartial<T>): string {
    if (!this._jsonStringify) {
      const mapSchema = (schema: Json): Json => {
        if (Array.isArray(schema)) {
          // eslint-disable-next-line unicorn/no-array-callback-reference
          return schema.map(mapSchema);
        }
        if (schema && typeof schema === 'object') {
          // fast-json-stringify adds the default value to the output
          const newSchema = omit(schema, 'default');

          if (newSchema.instanceof === 'Date' && !newSchema.type) {
            newSchema.type = 'string';
            newSchema.format = 'date-time';
          }

          for (const key of Object.keys(newSchema)) {
            newSchema[key] = mapSchema(newSchema[key]);
          }
          return newSchema;
        }
        return schema;
      };
      const newSchema = mapSchema(this.schema as unknown as Json);

      this._jsonStringify = fastJson({
        type: 'object',
        properties: newSchema as any,
        additionalProperties: false,
      });
    }

    return this._jsonStringify(pojo);
  }

  static _cols: ObjectOf<string> | undefined;

  // Relies on Objection to add quotes
  static get cols(): ModelColsMap<ModelType> {
    if (!this._cols) {
      const cols: ObjectOf<string> = {
        all: `${this.tableName}.*`,
      };
      for (const prop of Object.keys(this.schema)) {
        cols[prop] = `${this.tableName}.${prop}`;
      }
      this._cols = cols;
    }
    return this._cols as ModelColsMap<ModelType>;
  }

  static _colsQuoted: ObjectOf<string> | undefined;

  static get colsQuoted(): ModelColsMap<ModelType> {
    if (!this._colsQuoted) {
      const cols: ObjectOf<string> = {
        all: `"${this.tableName}".*`,
      };
      for (const prop of Object.keys(this.schema)) {
        cols[prop] = `"${this.tableName}"."${prop}"`;
      }
      this._colsQuoted = cols;
    }
    return this._colsQuoted as ModelColsMap<ModelType>;
  }

  static as<T extends ModelClass>(this: T, name: string): ModelColsMap<T['type']> {
    const cols: ObjectOf<string> = {
      all: `${name}.*`,
    };
    for (const prop of Object.keys(this.schema)) {
      cols[prop] = `${name}.${prop}`;
    }
    return cols as ModelColsMap<T['type']>;
  }

  static asQuoted<T extends ModelClass>(this: T, name: string): ModelColsMap<T['type']> {
    const cols: ObjectOf<string> = {
      all: `"${name}".*`,
    };
    for (const prop of Object.keys(this.schema)) {
      cols[prop] = `"${name}"."${prop}"`;
    }
    return cols as ModelColsMap<T['type']>;
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

  static mzIndexes: (string | string[])[] = [];

  static get primaryIndex(): string | string[] {
    if (!this.uniqueIndexes.length) {
      throw new Error(`${this.name}.primaryIndex: no unique indexes.`);
    }
    const index = this.uniqueIndexes[0];
    return Array.isArray(index) && index.length === 1 ? index[0] : index;
  }

  static _uniqueIndexes: ModelIndex<ModelClass>[] | undefined;

  // todo: low/mid add memoize decorator
  static getUniqueIndexes<T extends ModelClass>(this: T): ModelIndex<T>[] {
    if (!this._uniqueIndexes) {
      this._uniqueIndexes = this.uniqueIndexes.map(
        idx => (Array.isArray(idx) && idx.length === 1 ? idx[0] : idx),
      ) as ModelIndex<ModelClass>[];
    }
    return this._uniqueIndexes as ModelIndex<T>[];
  }

  static _uniqueSingleColumnsSet: Set<ModelKey<ModelClass>> | undefined;

  static getUniqueSingleColumnsSet<T extends ModelClass>(this: T): Set<ModelKey<T>> {
    if (!this._uniqueSingleColumnsSet) {
      this._uniqueSingleColumnsSet = new Set(
        this.uniqueIndexes
          .filter(index => typeof index === 'string' || index.length === 1)
          .map(index => (typeof index === 'string' ? index : index[0]) as ModelKey<ModelClass>),
      );
    }
    return this._uniqueSingleColumnsSet as Set<ModelKey<T>>;
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

  static _requiredCols: string[] | undefined;

  static get requiredCols(): string[] {
    if (!this._requiredCols) {
      this._requiredCols = TS.objEntries(this.schema)
        .filter(([_, schema]) => {
          if (isSchemaNullable(schema)) {
            return false;
          }
          const { nonNullSchema } = getNonNullSchema(schema);
          return nonNullSchema.default === undefined;
        })
        .map(pair => pair[0]);
    }
    return this._requiredCols;
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
    return super.fromJson<ModelInstance<T>>(json, opt);
  }

  /*
  Start Objection fields
  */

  static override get tableName(): string {
    return this.type;
  }

  static override get idColumn(): string {
    if (Array.isArray(this.primaryIndex)) {
      throw new TypeError(`${this.name}.idColumn: expected single column`);
    }
    return this.primaryIndex;
  }

  static _jsonSchema: ModelJsonSchema | undefined;

  static override get jsonSchema(): ModelJsonSchema {
    if (!this._jsonSchema) {
      const required: string[] = [];
      for (const pair of TS.objEntries(this.schema)) {
        if (
          (pair[0] as string !== 'id' && !hasDefault(pair[1]))
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
    return this._jsonSchema;
  }

  static override pickJsonSchemaProperties = true;

  static override useLimitInFirst = true;

  static override virtualAttributes = [
    'includedRelations',
  ];

  /*
  TS runs much faster when QueryBuilderType is an interface extending the base QueryBuilder
  rather than a class
  */
  declare QueryBuilderType: CustomQueryBuilder<this, this[]>;
  static override QueryBuilder = (CustomQueryBuilder as any);

  static override createValidator<T extends ModelClass>(this: T): AjvValidator {
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

  declare includedRelations?: string[];

  getId(): ApiEntityId {
    throw new Error(`${this.constructor.name}.getId: not implemented`);
  }

  /*
  To/from Pojo

  $toJson: may have Date, Buffer, etc

  $toDatabaseJson: may have Knex.raw

  $toCachePojo: Pojo, no relations/type

  $toApiPojo: Pojo, with relations/type, may have fields removed
  */

  override $toJson<T extends Model>(this: T, _opt: any): T['cls']['Interface'] {
    return modelInstanceToPojo(this) as T['cls']['Interface'];
  }

  override toJSON<T extends Model>(this: T, _opt: any): T['cls']['Interface'] {
    // low/easy deep freeze pojo
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

  static fromCachePojo<T extends ModelClass>(this: T, obj: ObjectOf<any>): ModelInstance<T> {
    obj = parseModel(this, obj as Partial<T['Interface']>);
    const ent = new this();
    for (const pair of TS.objEntries(obj)) {
      // @ts-expect-error perf
      ent[pair[0]] = pair[1];
    }

    if (!process.env.PRODUCTION && !IS_PROFILING_APIS) {
      ent.$validate();
    }

    return ent;
  }

  $toCachePojo<T extends Model>(this: T): ObjectOf<any> {
    return formatModelPojo(
      this.constructor as ModelClass,
      modelInstanceToPojo(this, false),
    );
  }

  $formatApiPojo<T extends ModelSerializedForApi>(obj: T): T {
    return obj;
  }

  $toApiPojo<T extends Model>(this: T): ModelSerializedForApi {
    const Model = this.constructor as RRModelClass;

    const obj = modelInstanceToPojo(this, false);
    const formatted = formatModelPojo<RRModelClass>(Model, obj);
    return deepFreezeIfDev(this.$formatApiPojo({
      type: Model.type,
      id: this.getId(),
      ...formatted,
      ...(this.includedRelations
        ? { includedRelations: [...new Set(this.includedRelations)] }
        : null),
    } as ModelSerializedForApi));
  }
}

export default BaseModel;

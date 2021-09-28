import deepMergeObjs from 'lib/deepMergeObjs';

export default class EntityBase extends Model {
  // todo: low/hard maybe make ids non-sequential
  // last_insert_id((0xe8e5* last_insert_id()) % power(2, 32))
  static idColumn = 'id';

  static type: EntityType;

  static virtualAttributes = ['type'];

  // todo: mid/hard validate json schema against mysql
  static dbJsonSchema = {
    type: 'object',
    required: [] as string[],
    properties: {} as Record<string, JSONSchema>,
    additionalProperties: false,
  };

  // For Objection to validate before updating DB.
  static get jsonSchema() {
    return this.dbJsonSchema;
  }

  static otherJsonSchema = {
    type: 'object',
    required: [] as string[],
    properties: {} as Record<string, JSONSchema>,
    additionalProperties: false,
  };

  static get allJsonSchema() {
    return deepMergeObjs(this.dbJsonSchema, this.otherJsonSchema);
  }

  static pickJsonSchemaProperties = true;

  protected static computedProperties = new Set<string>();

  static getComputedProperties<T extends typeof EntityBase>(this: T) {
    return this.computedProperties as Set<InstanceKey<T>>;
  }

  // todo: low/hard maybe use a unique prop as id.
  protected static uniqueProperties = new Set<string | string[]>(['id']);

  static getUniqueProperties<T extends typeof EntityBase>(this: T) {
    return this.uniqueProperties as Set<InstanceKey<T> | InstanceKey<T>[]>;
  }

  type!: EntityType;
  // todo: low/mid maybe allow string ids
  id!: number;
  // todo: low/easy maybe extras null by default
  extras: ObjectOf<any> = {};

  $formatApiJson(obj: SerializedEntity): SerializedEntity {
    return obj;
  }

  $formatApiJsonWrapper() {
    const obj = this.toJSON() as unknown as SerializedEntity;
    return this.$formatApiJson(obj);
  }
}

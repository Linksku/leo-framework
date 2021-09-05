import mergeConcatArrays from 'lib/mergeConcatArrays';

export default class EntityBase extends Model {
  // todo: mid/mid maybe replace id with random int
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
    return mergeConcatArrays(this.dbJsonSchema, this.otherJsonSchema);
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
  extras: ObjectOf<any> = {};
}

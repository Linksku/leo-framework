import type { JSONSchema } from 'objection';

export default class EntityBase extends Model {
  static idColumn = 'id';

  static type: EntityType;

  static virtualAttributes = ['type'];

  // todo: mid/hard validate json schema against mysql
  static jsonSchema = {
    type: 'object',
    required: [] as string[],
    properties: {} as ObjectOf<JSONSchema>,
    additionalProperties: false,
  };

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

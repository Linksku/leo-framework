export default class EntityBase extends Model {
  static get virtualAttributes() {
    return ['type'];
  }

  static type: EntityType;

  static jsonSchema = {
    properties: {} as ObjectOf<any>,
  };

  static pickJsonSchemaProperties = true;

  protected static computedProperties = new Set<string>();

  static getComputedProperties<T extends typeof EntityBase>(this: T) {
    return this.computedProperties as Set<InstanceKeys<T>>;
  }

  // todo: low/hard maybe use a unique prop as id.
  protected static uniqueProperties = new Set<string | string[]>(['id']);

  static getUniqueProperties<T extends typeof EntityBase>(this: T) {
    return this.uniqueProperties as Set<InstanceKeys<T> | InstanceKeys<T>[]>;
  }

  // todo: low/mid maybe allow string ids
  id!: number;
  extras: ObjectOf<any> = {};

  get type(): EntityType {
    return (this.constructor as typeof Entity).type;
  }
}

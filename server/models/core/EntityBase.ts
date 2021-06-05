export default class EntityBase extends Model {
  static get virtualAttributes() {
    return ['type'];
  }

  static type: EntityType;

  static jsonSchema = {
    properties: {},
  };

  static pickJsonSchemaProperties = true;

  static computedProperties = new Set<string>();

  // todo: low/hard maybe use a unique prop as id.
  static uniqueProperties = new Set<string | string[]>(['id']);

  // todo: low/mid maybe allow string ids
  id!: number;
  extras: ObjectOf<any> = {};

  get type(): EntityType {
    return (this.constructor as typeof Entity).type;
  }
}

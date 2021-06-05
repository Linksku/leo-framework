import type _Entity from 'models/core/Entity';

declare global {
  type Entity = _Entity;

  type EntityModel = typeof Entity;

  type SerializedEntity = {
    id: EntityId,
    type: EntityType,
    extras: ObjectOf<any>,
    [k: string]: any,
  };
}

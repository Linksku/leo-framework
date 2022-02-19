import type _Entity from 'lib/Model/Entity';

declare global {
  type EntityId = number;

  type Entity = _Entity;

  type EntityClass = typeof _Entity;

  interface IEntity extends IBaseModel {
    __isEntity: true;
    id: EntityId;
  }
}

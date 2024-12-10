import type _Entity from 'core/models/Entity';

declare global {
  // todo: mid/hard change to string for bigint
  type EntityId = number;

  type Entity = _Entity;

  type EntityClass = typeof _Entity;

  interface IBaseEntity extends IBaseModel {
    id: EntityId;
  }

  type EntityInstance<T extends { instanceType: Entity }> = T['instanceType'];

  type EntityTypeToInstance<T extends EntityType> = EntityType extends T
    ? Entity
    : ModelInstancesMap[T];

  type EntityTypeToClass<T extends EntityType> = EntityType extends T
    ? EntityClass
    : ModelClassesMap[T];

  type EntityTypeToInterface<T extends EntityType> = IBaseEntity & ModelInterfacesMap[T];

  type EntityPartial<T extends { Interface: IBaseEntity }> = Partial<T['Interface']>;
}

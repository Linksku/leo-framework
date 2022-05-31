import type _Entity from 'services/model/Entity';

declare global {
  type EntityId = number;

  type Entity = _Entity;

  type EntityClass = typeof _Entity;

  interface IBaseEntity extends IBaseModel {
    id: EntityId;
    version: number;
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

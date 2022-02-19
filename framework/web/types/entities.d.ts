/*
In server/, Entity is an instance of a model.
In web/, Entity is a pojo
*/

type EntityId = number | string;

type NumericEntityId = number;

type EntityType = ModelType;

type Entity = Memoed<{
  id: EntityId,
  type: EntityType,
  extras?: ObjectOf<any>,
}>;

type EntityClass = never;

type TypeToEntity<T extends EntityType> = EntityInstancesMap[T];

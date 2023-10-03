/*
In server/, Entity is an instance of a model.
In web/, Entity is a pojo
*/

type EntityType = RRModelType;

type EntityId = ApiEntityId;

type NumericEntityId = number;

interface BaseEntity extends Stable<ModelSerializedForApi> {
  __isModel: true;
}

type EntityClass = never;

type Entity<T extends EntityType = EntityType> = EntityType extends T
  ? BaseEntity
  : EntityInstancesMap[T];

type EntityTypeToInterface<T extends EntityType> = ModelInterfacesMap[T];

type EntityRelationTypes = {
  [T in keyof AllModelRelationsMap]: keyof AllModelRelationsMap[T] extends any
    ? {
      [K in keyof AllModelRelationsMap[T]]: AllModelRelationsMap[T][K]['tsType'] extends any[]
        ? EntityInstancesMap[AllModelRelationsMap[T][K]['modelType']][]
        : AllModelRelationsMap[T][K]['tsType'] extends null
          ? null
          : EntityInstancesMap[AllModelRelationsMap[T][K]['modelType']];
    }
    : never;
};

/*
In server/, Entity is an instance of a model.
In web/, Entity is a pojo
*/

type EntityType = ModelType;

type EntityId = ApiEntityId;

type NumericEntityId = number;

type Entity = Memoed<ModelSerializedForApi>;

type EntityClass = never;

type TypeToEntity<T extends EntityType> = EntityInstancesMap[T];

type EntityTypeToInterface<T extends EntityType> = ModelInterfacesMap[T];

type EntityRelationTypes<T extends ModelType> = AllModelRelationsMap[T] extends any
  ? {
    [K in keyof AllModelRelationsMap[T]]: AllModelRelationsMap[T][K]['tsType'];
  }
  : never;

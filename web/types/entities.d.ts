type Entity = Memoed<{
  id: EntityId,
  type: EntityType,
  extras: ObjectOf<any>,
}>;

type SerializedEntity = Entity;

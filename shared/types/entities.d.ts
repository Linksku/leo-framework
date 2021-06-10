type EntitiesMap<T extends keyof TypeToEntity> = ObjectOf<TypeToEntity<T>>;

type EntityId = number | string;

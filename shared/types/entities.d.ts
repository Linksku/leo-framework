type EntitiesMap<T extends keyof TypeToEntity> = ObjectOf<Memoed<TypeToEntity<T>>>;

type EntityId = number | string;

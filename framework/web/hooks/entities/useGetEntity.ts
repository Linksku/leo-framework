export default function useGetEntity<T extends EntityType>(type: T): Memoed<
  (id: Nullish<EntityId | (string | number)[]>) => Memoed<TypeToEntity<T>> | null
  > {
  const { entitiesRef } = useEntitiesStore();
  return useConst(() => (_id: Nullish<EntityId | (string | number)[]>) => {
    const id = Array.isArray(_id) ? _id.join(',') : _id;
    return id
      ? (entitiesRef.current[type]?.[id] ?? null) as unknown as Memoed<TypeToEntity<T>> | null
      : null;
  });
}

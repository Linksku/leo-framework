export default function useGetEntities(): Memoed<
  <T extends EntityType>(type: T) => Memoed<ObjectOf<Memoed<TypeToEntity<T>>>>
  > {
  const { entitiesRef } = useEntitiesStore();
  return useConst(() => <T extends EntityType>(type: T) => (
    entitiesRef.current[type] ?? EMPTY_OBJ
  ) as Memoed<ObjectOf<Memoed<TypeToEntity<T>>>>);
}

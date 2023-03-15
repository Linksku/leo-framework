export default function useGetAllEntities<T extends EntityType>(type: T): Memoed<
  () => Memoed<ObjectOf<Memoed<TypeToEntity<T>>>>
> {
  const { entitiesRef } = useEntitiesStore();
  return useConst(() => () => (
    entitiesRef.current[type] ?? EMPTY_OBJ
  ) as Memoed<ObjectOf<Memoed<TypeToEntity<T>>>>);
}

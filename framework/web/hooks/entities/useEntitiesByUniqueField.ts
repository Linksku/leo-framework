import useGetEntitiesByUniqueFields from './useGetEntitiesByUniqueFields';

export default function useEntitiesByUniqueField<
  T extends EntityType,
  F extends keyof Entity<T>,
>(
  type: T | null,
  field: F,
): Stable<Map<Entity<T>[F], Entity<T>>> {
  const getEntitiesByUniqueFields = useGetEntitiesByUniqueFields(type);
  const allEntities = useAllEntities(type);
  return useMemo(
    () => getEntitiesByUniqueFields([field]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      getEntitiesByUniqueFields,
      field,
      allEntities,
    ],
  );
}

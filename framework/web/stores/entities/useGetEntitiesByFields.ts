export default function useGetEntitiesByFields<
  T extends EntityType,
>(
  type: T | null,
): Stable<(
  fields: T extends EntityType ? Partial<Entity<T>> : null,
) => Entity<T>[]> {
  const { getEntities } = useEntitiesIndexStore();

  return useCallback((
    fields: T extends EntityType ? Partial<Entity<T>> : null,
  ) => {
    if (!type || !fields) {
      return EMPTY_ARR;
    }
    return getEntities(
      type,
      fields as ObjectOf<any>,
    ) as Entity<T>[];
  }, [type, getEntities]);
}

import useGetAllEntities from './useGetAllEntities';

export default function useGetEntitiesByUniqueFields<T extends EntityType>(
  type: T | null,
) {
  const { entitiesByUniqueFieldsRef } = useEntitiesStore();
  const getAllEntities = useGetAllEntities(type);

  return useCallback(<Fields extends (keyof Entity<T>)[]>(
    fields: Fields,
  ): Stable<Map<
    Fields extends [any, any] ? string : Entity<T>[Fields[number]],
    Entity<T>
  >> => {
    if (!type) {
      return EMPTY_MAP;
    }

    if (!entitiesByUniqueFieldsRef.current.has(type)) {
      entitiesByUniqueFieldsRef.current.set(type, new Map());
    }
    const fieldsToEntities = TS.defined(entitiesByUniqueFieldsRef.current.get(type));
    const fieldsKey = fields.join(',');
    const entitiesToIndex = TS.mapValOrSetDefault(
      fieldsToEntities,
      fieldsKey,
      new WeakMap(),
    );

    const allEntities = getAllEntities();
    if (!entitiesToIndex.has(allEntities)) {
      const entitiesMap = markStable(new Map<any, Entity>());
      for (const pair of allEntities) {
        const entity = pair[1];
        const key = fields.length === 1
          // @ts-ignore entity key
          ? entity[fields[0]]
          : fields.map(
            // @ts-ignore entity key
            field => entity[field],
          ).join(',');
        if (!process.env.PRODUCTION && entitiesMap.has(key)) {
          throw new Error(`useGetEntitiesByUniqueFields: duplicate ${type} ${fields.join(',')}=${key}`);
        }
        entitiesMap.set(key, entity);
      }
      entitiesToIndex.set(allEntities, entitiesMap);
    }
    return entitiesToIndex.get(allEntities) as any;
  }, [type, entitiesByUniqueFieldsRef, getAllEntities]);
}

function useEntityByField<T extends EntityType>(
  type: T | null,
  field: string,
): Memoed<ObjectOf<TypeToEntity<T>>> {
  const entities = useAllEntities(type);
  return useGlobalMemo(
    `useEntityByField:${type},${field}`,
    () => {
      const obj = Object.create(null) as Memoed<ObjectOf<TypeToEntity<T>>>;
      for (const e of TS.objValues(entities)) {
        const val = process.env.PRODUCTION
          ? (e as any)[field]
          : TS.assertType<string | number>(
            (e as any)[field],
            v => typeof v === 'string' || typeof v === 'number',
          );
        obj[val] = e;
      }
      return obj;
    },
    [entities, field],
  );
}

export default useEntityByField;

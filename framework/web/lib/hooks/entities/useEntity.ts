import useUpdate from 'lib/hooks/useUpdate';

// high/hard this might be triggering multiple times per new entity
export default function useEntity<T extends EntityType>(
  type: T,
  _id: Nullish<EntityId | (string | number)[]>,
): Memoed<TypeToEntity<T>> | null {
  const id = Array.isArray(_id) ? _id.join(',') : _id;
  const { entitiesRef, addEntityListener } = useEntitiesStore();
  const update = useUpdate();

  useEffect(() => {
    if (id == null) {
      return undefined;
    }

    const offLoad = addEntityListener('load', type, id, update);
    const offCreate = addEntityListener('create', type, id, update);
    const offUpdate = addEntityListener('update', type, id, update);
    const offDelete = addEntityListener('delete', type, id, update);

    return () => {
      offLoad();
      offCreate();
      offUpdate();
      offDelete();
    };
  }, [addEntityListener, type, id, update]);

  return id
    ? (entitiesRef.current[type]?.[id] ?? null) as unknown as Memoed<TypeToEntity<T>> | null
    : null;
}

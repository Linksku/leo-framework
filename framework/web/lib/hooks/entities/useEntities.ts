import useUpdate from 'lib/hooks/useUpdate';

export default function useEntities<T extends EntityType>(
  type: T,
): Memoed<ObjectOf<Memoed<TypeToEntity<T>>>> {
  const { entitiesRef, addEntityListener } = useEntitiesStore();
  const update = useUpdate();

  useEffect(() => {
    const offLoad = addEntityListener('load', type, update);
    const offUpdate = addEntityListener('update', type, update);
    const offCreate = addEntityListener('create', type, update);
    const offDelete = addEntityListener('delete', type, update);

    return () => {
      offLoad();
      offCreate();
      offUpdate();
      offDelete();
    };
  }, [addEntityListener, type, update]);

  return (entitiesRef.current[type] || EMPTY_OBJ) as Memoed<ObjectOf<Memoed<TypeToEntity<T>>>>;
}

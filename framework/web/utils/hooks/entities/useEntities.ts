import useHandleEntityEvents from 'utils/hooks/entities/useHandleEntityEvents';
import useUpdate from 'utils/hooks/useUpdate';

export default function useEntities<T extends EntityType>(
  entityType: T,
): Memoed<ObjectOf<Memoed<TypeToEntity<T>>>> {
  const { entitiesRef } = useEntitiesStore();
  const update = useUpdate();

  useHandleEntityEvents(
    useMemo(() => [
      { actionType: 'load', entityType },
      { actionType: 'create', entityType },
      { actionType: 'update', entityType },
      { actionType: 'delete', entityType },
    ], [entityType]),
    update,
  );

  return (
    entitiesRef.current[entityType] || EMPTY_OBJ
  ) as Memoed<ObjectOf<Memoed<TypeToEntity<T>>>>;
}

import useHandleEntityEvents from 'utils/hooks/entities/useHandleEntityEvents';
import useUpdate from 'utils/hooks/useUpdate';

export default function useAllEntities<T extends EntityType>(
  entityType: T | null,
): Memoed<ObjectOf<Memoed<TypeToEntity<T>>>> {
  const { entitiesRef } = useEntitiesStore();
  const update = useUpdate();

  useHandleEntityEvents(
    useMemo(
      () => (entityType
        ? [
          { actionType: 'load', entityType },
          { actionType: 'create', entityType },
          { actionType: 'update', entityType },
          { actionType: 'delete', entityType },
        ]
        : []),
      [entityType],
    ),
    update,
  );

  return entityType
    ? (
      entitiesRef.current[entityType] || EMPTY_OBJ
    ) as Memoed<ObjectOf<Memoed<TypeToEntity<T>>>>
    : EMPTY_OBJ;
}

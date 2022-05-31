import useHandleEntityEvents from 'utils/hooks/entities/useHandleEntityEvents';
import useUpdate from 'utils/hooks/useUpdate';

// todo: high/hard this might be triggering multiple times per new entity
// todo: high/mid detect missing entities in dev
export default function useEntity<T extends EntityType>(
  entityType: T,
  _id: Nullish<EntityId | (string | number)[]>,
): Memoed<TypeToEntity<T>> | null {
  const id = Array.isArray(_id) ? _id.join(',') : _id;
  const { entitiesRef } = useEntitiesStore();
  const update = useUpdate();

  useHandleEntityEvents(
    useMemo(() => (
      id == null
        ? []
        : [
          { actionType: 'load', entityType, id },
          { actionType: 'create', entityType, id },
          { actionType: 'update', entityType, id },
          { actionType: 'delete', entityType, id },
        ]
    ), [entityType, id]),
    update,
  );

  return id
    ? (entitiesRef.current[entityType]?.[id] ?? null) as unknown as Memoed<TypeToEntity<T>> | null
    : null;
}

import type { EntitiesMap } from 'stores/EntitiesStore';
import useHandleEntityEvents from 'utils/hooks/entities/useHandleEntityEvents';
import useUpdate from 'utils/hooks/useUpdate';

export default function useEntitiesArr<T extends EntityType>(
  entityType: T,
  _ids: (EntityId | (string | number)[])[],
  opts: {
    throwIfMissing?: boolean,
  } = {},
): Memoed<Memoed<TypeToEntity<T>>[]> {
  const ids = useDeepMemoObj(_ids.map(
    id => (Array.isArray(id) ? id.join(',') : id),
  ));
  const { entitiesRef } = useEntitiesStore();
  const update = useUpdate();

  useHandleEntityEvents(
    useMemo(
      () => ids.flatMap(id => [
        { actionType: 'load', entityType, id },
        { actionType: 'create', entityType, id },
        { actionType: 'update', entityType, id },
        { actionType: 'delete', entityType, id },
      ]),
      [entityType, ids],
    ),
    update,
  );

  const entitiesMap = entitiesRef.current[entityType] as EntitiesMap<TypeToEntity<T>> | undefined;
  if (opts.throwIfMissing) {
    const missingIdx = ids.findIndex(id => !entitiesMap?.[id]);
    if (missingIdx >= 0) {
      throw new Error(`Entities array missing ${entityType} ${ids[missingIdx]}`);
    }
  }
  const arr = useMemo(
    () => TS.filterNulls(ids.map(id => entitiesMap?.[id])),
    [ids, entitiesMap],
  );
  return arr;
}

import { useSyncExternalStore } from 'react';

import { getEntitiesState, EntitiesUsage } from 'stores/EntitiesStore';
import isDebug from 'utils/isDebug';
import useCheckEntityExists from './useCheckEntityExists';

export default function useEntity<T extends EntityType>(
  entityType: T | null,
  _id: Nullish<EntityId | (string | number)[]>,
): Entity<T> | null {
  const id = Array.isArray(_id) ? _id.join(',') : _id;
  const { addEntityListener } = useEntitiesStore();

  const entity = useSyncExternalStore(
    useCallback(cb => {
      if (!entityType || id == null) {
        return NOOP;
      }

      const unsubs = [
        addEntityListener('load', entityType, id, cb),
        addEntityListener('create', entityType, id, cb),
        addEntityListener('update', entityType, id, cb),
        addEntityListener('delete', entityType, id, cb),
      ];
      return () => {
        for (const unsub of unsubs) {
          unsub();
        }
      };
    }, [addEntityListener, entityType, id]),
    () => (entityType && id
      ? (getEntitiesState().get(entityType)?.get(id) ?? null) as Entity<T> | null
      : null),
  );

  if (!process.env.PRODUCTION) {
    const usage = entity && EntitiesUsage.get(entity);
    if (usage) {
      usage.lastReadTime = performance.now();
    }

    if (isDebug) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const partial = useMemo(() => (id ? { id } as ObjectOf<ApiEntityId> : null), [id]);
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useCheckEntityExists(
        entityType,
        partial,
        entity,
      );
    }
  }

  return entity;
}

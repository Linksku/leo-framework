import { useSyncExternalStore } from 'react';

import type { EntitiesMap } from 'stores/EntitiesStore';
import { getEntitiesState } from 'stores/EntitiesStore';

export default function useAllEntities<T extends EntityType>(
  entityType: T | null,
): EntitiesMap<Entity<T>> {
  const { addEntityListener } = useEntitiesStore();

  return useSyncExternalStore(
    useCallback(cb => {
      if (!entityType) {
        return NOOP;
      }

      const unsubs = [
        addEntityListener('load', entityType, cb),
        addEntityListener('create', entityType, cb),
        addEntityListener('update', entityType, cb),
        addEntityListener('delete', entityType, cb),
      ];
      return () => {
        for (const unsub of unsubs) {
          unsub();
        }
      };
    }, [addEntityListener, entityType]),
    () => (entityType
      ? (
        getEntitiesState().get(entityType) ?? EMPTY_MAP
      ) as EntitiesMap<Entity<T>>
      : EMPTY_MAP),
  );
}

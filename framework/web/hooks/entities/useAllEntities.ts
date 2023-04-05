import { useSyncExternalStore } from 'react';

export default function useAllEntities<T extends EntityType>(
  entityType: T | null,
): Memoed<ObjectOf<Memoed<TypeToEntity<T>>>> {
  const { entitiesRef, addEntityListener } = useEntitiesStore();

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
        entitiesRef.current[entityType] || EMPTY_OBJ
      ) as Memoed<ObjectOf<Memoed<TypeToEntity<T>>>>
      : EMPTY_OBJ),
  );
}

import { useSyncExternalStore } from 'react';

import RelationConfigsEventEmitter from 'services/RelationConfigsEventEmitter';

export default function useRelationConfig(entityType: EntityType, relationName: string) {
  const { relationConfigsRef } = useRelationsStore();

  return useSyncExternalStore(
    useCallback(cb => {
      const key = `${entityType},${relationName}`;
      RelationConfigsEventEmitter.on(key, cb);
      return () => {
        RelationConfigsEventEmitter.off(key, cb);
      };
    }, [entityType, relationName]),
    () => (
      relationConfigsRef.current.get(entityType)?.get(relationName) ?? null
    ) as Stable<ApiRelationConfig> | null,
  );
}

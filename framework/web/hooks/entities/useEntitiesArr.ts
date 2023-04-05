import { useSyncExternalStore } from 'react';

import { API_TIMEOUT } from 'settings';
import useShallowMemoObj from 'hooks/useShallowMemoObj';
import useTimeout from 'hooks/useTimeout';

function useEntitiesArr<T extends EntityType>(
  entityType: T,
  _ids: (EntityId | (string | number)[])[],
  opts: {
    nullIfMissing: true,
    throwIfMissing?: boolean,
    allowMissing?: boolean,
  },
): Memoed<(Memoed<TypeToEntity<T>> | null)[]>;

function useEntitiesArr<T extends EntityType>(
  entityType: T,
  _ids: (EntityId | (string | number)[])[],
  opts?: {
    nullIfMissing?: false,
    throwIfMissing?: boolean,
    allowMissing?: boolean,
  },
): Memoed<Memoed<TypeToEntity<T>>[]>;

function useEntitiesArr<T extends EntityType>(
  entityType: T,
  _ids: (EntityId | (string | number)[])[],
  opts: {
    nullIfMissing?: boolean,
    throwIfMissing?: boolean,
    allowMissing?: boolean,
  } = {},
) {
  const ids = _ids.map(
    id => (Array.isArray(id) ? id.join(',') : id),
  );
  const stableIds = useMemo(
    () => [...new Set(ids)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ids.join('|')],
  );

  const { entitiesRef, addEntityListener } = useEntitiesStore();
  const allEntities = useSyncExternalStore(
    useCallback(cb => {
      if (!entityType) {
        return NOOP;
      }

      const unsubs = stableIds.flatMap(id => [
        addEntityListener('load', entityType, id, cb),
        addEntityListener('create', entityType, id, cb),
        addEntityListener('update', entityType, id, cb),
        addEntityListener('delete', entityType, id, cb),
      ]);
      return () => {
        for (const unsub of unsubs) {
          unsub();
        }
      };
    }, [addEntityListener, entityType, stableIds]),
    () => (entityType
      ? (
        entitiesRef.current[entityType] || EMPTY_OBJ
      ) as Memoed<ObjectOf<Memoed<TypeToEntity<T>>>>
      : EMPTY_OBJ),
  );

  const [waited, setWaited] = useState(false);
  if (!process.env.PRODUCTION) {
    /* eslint-disable react-hooks/rules-of-hooks */
    useTimeout(
      useCallback(() => {
        if (!opts.allowMissing && !waited
          && stableIds.some(id => !allEntities?.[id])) {
          setWaited(true);
        }
      }, [opts.allowMissing, waited, stableIds, allEntities]),
      API_TIMEOUT,
    );
    /* eslint-enable react-hooks/rules-of-hooks */
  }

  if (opts.throwIfMissing) {
    const missingIdx = ids.findIndex(id => !allEntities?.[id]);
    if (missingIdx >= 0) {
      throw new Error(`Entities array missing ${entityType} ${ids[missingIdx]}`);
    }
  } else if (!process.env.PRODUCTION && !opts.allowMissing && waited) {
    const missingIdx = ids.findIndex(id => !allEntities?.[id]);
    if (missingIdx >= 0) {
      ErrorLogger.warn(new Error(`useEntitiesArr: missing ${entityType} ${ids[missingIdx]}`));
    }
  }

  const entitiesArr = ids.map(id => allEntities?.[id] ?? null);
  // Can't use useMemo because other ids in allEntities can change
  return useShallowMemoObj(
    opts.nullIfMissing ? entitiesArr : TS.filterNulls(entitiesArr),
  );
}

export default useEntitiesArr;

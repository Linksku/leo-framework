import { useSyncExternalStore } from 'react';

import type { EntitiesMap } from 'stores/EntitiesStore';
import { getEntitiesState, EntitiesUsage } from 'stores/EntitiesStore';
import { API_TIMEOUT } from 'consts/server';
import useTimeout from 'hooks/useTimeout';
import useShallowMemoArr from 'hooks/useShallowMemoArr';

function useEntitiesArr<T extends EntityType>(
  entityType: Nullish<T>,
  _ids: (EntityId | (string | number)[])[],
  opts: {
    nullIfMissing: true,
    throwIfMissing?: boolean,
    allowMissing?: boolean,
  },
): Stable<(Entity<T> | null)[]>;

function useEntitiesArr<T extends EntityType>(
  entityType: Nullish<T>,
  _ids: (EntityId | (string | number)[])[],
  opts?: {
    nullIfMissing?: false,
    throwIfMissing?: boolean,
    allowMissing?: boolean,
  },
): Stable<Entity<T>[]>;

function useEntitiesArr<T extends EntityType>(
  entityType: Nullish<T>,
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

  const { addEntityListener } = useEntitiesStore();
  const entitiesState = getEntitiesState();
  const allEntities = useSyncExternalStore(
    useCallback(cb => {
      if (!entityType) {
        return NOOP;
      }

      const unsubs = stableIds.flatMap(id => TS.filterNulls([
        entitiesState.get(entityType)
          ? null
          : addEntityListener('load', entityType, id, cb),
        addEntityListener('create', entityType, id, cb),
        addEntityListener('update', entityType, id, cb),
        addEntityListener('delete', entityType, id, cb),
      ]));
      return () => {
        for (const unsub of unsubs) {
          unsub();
        }
      };
    }, [entitiesState, addEntityListener, entityType, stableIds]),
    () => (entityType
      ? (entitiesState.get(entityType) as EntitiesMap<Entity<T>> | undefined)
      : undefined),
  );

  const [waited, setWaited] = useState(false);
  if (!process.env.PRODUCTION) {
    if (allEntities) {
      for (const id of ids) {
        const entity = allEntities.get(id);
        const usage = entity && EntitiesUsage.get(entity);
        if (usage) {
          usage.lastReadTime = performance.now();
        }
      }
    }

    /* eslint-disable react-hooks/rules-of-hooks */
    useTimeout(
      useCallback(() => {
        if (!opts.allowMissing && !waited
          && stableIds.some(id => !allEntities?.get(id))) {
          setWaited(true);
        }
      }, [opts.allowMissing, waited, stableIds, allEntities]),
      API_TIMEOUT,
    );
    /* eslint-enable react-hooks/rules-of-hooks */
  }

  const entitiesArr = ids.map(id => allEntities?.get(id) ?? null);
  if (opts.throwIfMissing) {
    const missingIdx = entitiesArr.indexOf(null);
    if (missingIdx >= 0) {
      throw new Error(`Entities array missing ${entityType} ${ids[missingIdx]}`);
    }
  } else if (!process.env.PRODUCTION && !opts.allowMissing && waited) {
    const missingIdx = entitiesArr.indexOf(null);
    if (missingIdx >= 0) {
      ErrorLogger.warn(new Error(`useEntitiesArr: missing ${entityType} ${ids[missingIdx]}`));
    }
  }

  // Can't use useMemo because other ids in allEntities can change
  return useShallowMemoArr(
    opts.nullIfMissing ? entitiesArr : TS.filterNulls(entitiesArr),
  );
}

export default useEntitiesArr;

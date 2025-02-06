import type { EntitiesMap } from 'stores/entities/EntitiesStore';
import { entitiesMapsFamily, EntitiesUsage } from 'stores/entities/EntitiesStore';
import { DEFAULT_API_TIMEOUT } from 'consts/server';
import useTimeout from 'utils/useTimeout';
import useShallowMemoArr from 'utils/useShallowMemoArr';

const emptyMapAtom = atom(new Map());

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
): Stable<(Entity<T> | null)[]> {
  const ids = _ids.map(
    id => (Array.isArray(id) ? id.join(',') : id),
  );
  useDebugValue(`${entityType},${ids.join('|')}`);

  const stableIds = useMemo(
    () => [...new Set(ids)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ids.join('|')],
  );

  const allEntities = useAtomValue(
    entityType ? entitiesMapsFamily(entityType) : emptyMapAtom,
  ) as EntitiesMap<Entity<T>>;

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
      DEFAULT_API_TIMEOUT,
    );
    /* eslint-enable react-hooks/rules-of-hooks */
  }

  const entitiesArr = ids.map(id => allEntities?.get(id) ?? null);
  if (opts.throwIfMissing) {
    const missingIdx = entitiesArr.indexOf(null);
    if (missingIdx >= 0) {
      throw new Error(`useEntitiesArr: entities array missing ${entityType} ${ids[missingIdx]}`);
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

import type { OptsWithoutSet, OptsWithSet } from './useEntitiesByFields';
import useEntitiesByFields from './useEntitiesByFields';

function useEntityByField<T extends EntityType>(
  type: T | null,
  field: string,
  opts?: OptsWithoutSet<T>
): Memoed<ObjectOf<TypeToEntity<T>>>;

function useEntityByField<T extends EntityType, F extends keyof TypeToEntity<T>>(
  type: T | null,
  field: F,
  opts?: OptsWithSet<T>
): Memoed<ObjectOf<TypeToEntity<T>>>;

function useEntityByField<T extends EntityType>(
  type: T | null,
  field: string,
  opts?: OptsWithoutSet<T> | OptsWithSet<T>,
) {
  const entitiesByFields = useEntitiesByFields(
    type,
    TS.literal([field] as const),
    // @ts-ignore unions don't work properly
    opts,
  );
  return useMemo(() => {
    const newObj = Object.create(null) as ObjectOf<TypeToEntity<T>>;
    for (const [val, entities] of TS.objEntries(entitiesByFields)) {
      if (!process.env.PRODUCTION && (
        (Array.isArray(entities) && entities.length > 1)
        || (entities instanceof Set && entities.size > 1)
      )) {
        // todo: low/mid log dev errors in production
        throw new Error(`useEntityByField(${type}, ${field}): more than 1 entity for ${val}`);
      }
      newObj[val] = entities.slice()[0];
    }
    return newObj;
  }, [entitiesByFields, field, type]);
}

export default useEntityByField;
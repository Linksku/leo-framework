import type { OptsWithoutSet, OptsWithSet } from './useEntitiesByFields';
import useEntitiesByFields from './useEntitiesByFields';

function useEntitiesByField<T extends EntityType>(
  type: T,
  field: string,
  opts?: OptsWithoutSet<T>
): Memoed<ObjectOf<TypeToEntity<T>[]>>;

function useEntitiesByField<T extends EntityType, F extends keyof TypeToEntity<T>>(
  type: T,
  field: F,
  opts?: OptsWithSet<T>
): Memoed<ObjectOf<Set<TypeToEntity<T>[F]>>>;

function useEntitiesByField<T extends EntityType>(
  type: T,
  field: string,
  opts?: OptsWithoutSet<T> | OptsWithSet<T>,
) {
  return useEntitiesByFields(
    type,
    useMemo(() => [field], [field]),
    // @ts-ignore unions don't work properly
    opts,
  ) as unknown;
}

export default useEntitiesByField;

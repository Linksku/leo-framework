import type { OptsWithoutSet, OptsWithSet } from './useEntitiesByFields';
import useEntitiesByFields from './useEntitiesByFields';

function useEntitiesByField<
  T extends EntityType,
  F extends keyof Entity<T>,
>(
  type: T | null,
  field: F,
  opts?: OptsWithoutSet<T>
): Stable<Map<Entity<T>[F], Stable<Entity<T>[]>>>;

function useEntitiesByField<
  T extends EntityType,
  F extends keyof Entity<T>,
  FieldForSet extends keyof Entity<T>,
>(
  type: T | null,
  field: F,
  opts: OptsWithSet<T, FieldForSet>
): Stable<Map<Entity<T>[F], Stable<Set<Entity<T>[FieldForSet]>>>>;

function useEntitiesByField<T extends EntityType>(
  type: T | null,
  field: string,
  opts?: OptsWithoutSet<T> | OptsWithSet<T>,
) {
  return useEntitiesByFields(
    type,
    TS.literal([field] as const),
    // @ts-ignore unions don't work properly
    opts,
  ) as unknown;
}

export default useEntitiesByField;

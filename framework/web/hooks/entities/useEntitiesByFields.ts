type ArrMap<T extends EntityType> = Map<
  string | number,
  Stable<Entity<T>[]> | ArrMap<T>
>;

type SetMap<T extends EntityType> = Map<
  string | number,
  Stable<Set<any>> | SetMap<T>
>;

export type OptsWithoutSet<T extends EntityType> = {
  sortField?: keyof Entity<T>,
  sortDirection?: 'desc' | 'asc',
  fieldForSet?: never,
};

export type OptsWithSet<T extends EntityType, FieldForSet = keyof Entity<T>> = {
  sortField?: keyof Entity<T>,
  sortDirection?: 'desc' | 'asc',
  fieldForSet: FieldForSet,
};

type RetArr<
  T extends EntityType,
  Fields extends readonly any[],
> = Fields extends readonly [infer F, ...infer R]
  ? Stable<Map<
    // @ts-ignore entity field
    Entity<T>[F],
    RetArr<T, R>
  >>
  : Stable<Entity<T>[]>;

type RetSet<
  T extends EntityType,
  Fields extends readonly any[],
  FieldForSet extends keyof Entity<T>,
> = Fields extends readonly [infer F, ...infer R]
  ? Stable<Map<
    // @ts-ignore entity field
    Entity<T>[F],
    RetSet<T, R, FieldForSet>
  >>
  : Stable<Set<FieldForSet>>;

function useEntitiesByFields<T extends EntityType, Fields extends readonly string[]>(
  type: T | null,
  fields: Fields,
  opts?: OptsWithoutSet<T>,
): RetArr<T, Fields>;

function useEntitiesByFields<
  T extends EntityType,
  Fields extends readonly string[],
  FieldForSet extends keyof Entity<T>,
>(
  type: T | null,
  fields: Fields,
  opts: OptsWithSet<T, FieldForSet>,
): RetSet<T, Fields, FieldForSet>;

function useEntitiesByFields<
  T extends EntityType,
  Fields extends readonly (keyof Entity<T>)[],
>(
  type: T | null,
  fields: Fields,
  { sortField, sortDirection, fieldForSet }: OptsWithoutSet<T> | OptsWithSet<T> = {},
) {
  const entities = useAllEntities(type);
  return useGlobalMemo(
    `useEntitiesByFields:${type},${fields.join(', ')}`,
    () => {
      const obj = new Map() as ArrMap<T> | SetMap<T>;
      for (const ent of entities.values()) {
        let obj2 = obj;
        for (const field of fields.slice(0, -1)) {
          // Maybe change to use a symbol for null.
          const tmp = ent[field] === null ? 'null' : ent[field];
          const val = process.env.PRODUCTION
            ? tmp as string | number
            : TS.assertType<string | number>(
              tmp,
              v => typeof v === 'string' || typeof v === 'number',
            );
          obj2 = TS.mapValOrSetDefault(
            obj2,
            val,
            new Map(),
          );
        }

        const lastField = fields.at(-1);
        // @ts-ignore entity field
        const tmp = ent[lastField] === null ? 'null' : ent[lastField];
        const lastVal = process.env.PRODUCTION
          ? tmp as string | number
          : TS.assertType<string | number>(
            tmp,
            v => typeof v === 'string' || typeof v === 'number',
          );
        if (fieldForSet) {
          const setMap = obj2 as Map<string | number, Stable<Set<any>>>;
          const tempSet = setMap.get(lastVal) ?? (new Set() as Stable<Set<any>>);
          setMap.set(lastVal, tempSet);
          tempSet.add(ent[fieldForSet]);
        } else {
          const arrMap = obj2 as Map<string | number, Stable<Entity<T>[]> >;
          const tempArr = arrMap.get(lastVal) ?? ([] as unknown as Stable<Entity<T>[]>);
          arrMap.set(lastVal, tempArr);
          tempArr.push(ent);
        }
      }

      if (!fieldForSet && sortField) {
        const multiplier = sortDirection === 'desc' ? -1 : 1;
        const stack = [obj as Stable<Entity<T>[]> | ArrMap<T>];
        while (stack.length) {
          const obj2 = stack.shift();
          if (obj2 instanceof Map) {
            for (const val of obj2.values()) {
              stack.push(val);
            }
          } else if (obj2) {
            obj2.sort((a, b) => (
              a[sortField] > b[sortField]
                ? multiplier
                : -1 * multiplier
            ));
          }
        }
      }

      return obj as RetArr<T, Fields> | RetSet<T, Fields, keyof Entity<T>>;
    },
    [entities, fields.join(',')],
  );
}

export default useEntitiesByFields;

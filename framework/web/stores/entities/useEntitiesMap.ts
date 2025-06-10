type ArrMap<T extends EntityType> = Map<
  string | number,
  Stable<Entity<T>[]> | ArrMap<T>
>;

type SetMap<T extends EntityType> = Map<
  string | number,
  Stable<Set<any>> | SetMap<T>
>;

export type OptsWithoutSet<T extends EntityType> = {
  sortCol?: keyof Entity<T>,
  sortDirection?: 'desc' | 'asc',
  colForSet?: never,
};

export type OptsWithSet<T extends EntityType, ColForSet = keyof Entity<T>> = {
  sortCol?: keyof Entity<T>,
  sortDirection?: 'desc' | 'asc',
  colForSet: ColForSet,
};

type RetArr<
  T extends EntityType,
  Cols extends readonly any[],
> = Cols extends readonly [infer C, ...infer R]
  ? Stable<Map<
    // @ts-expect-error entity field
    Entity<T>[C],
    RetArr<T, R>
  >>
  : Stable<Entity<T>[]>;

type RetSet<
  T extends EntityType,
  Cols extends readonly any[],
  ColForSet extends keyof Entity<T>,
> = Cols extends readonly [infer C, ...infer R]
  ? Stable<Map<
    // @ts-expect-error entity field
    Entity<T>[C],
    RetSet<T, R, ColForSet>
  >>
  : Stable<Set<ColForSet>>;

function useEntitiesMap<
  T extends EntityType,
  Cols extends (keyof Entity<T> & string)[] | [keyof Entity<T> & string],
>(
  type: T | null,
  cols: Cols,
  opts?: OptsWithoutSet<T>,
): RetArr<T, Cols>;

function useEntitiesMap<
  T extends EntityType,
  Cols extends (keyof Entity<T> & string)[] | [keyof Entity<T> & string],
  ColForSet extends keyof Entity<T>,
>(
  type: T | null,
  cols: Cols,
  opts: OptsWithSet<T, ColForSet>,
): RetSet<T, Cols, ColForSet>;

// todo: med/med checkEntityExists for accessing entities map keys
function useEntitiesMap<
  T extends EntityType,
  Cols extends (keyof Entity<T> & string)[] | [keyof Entity<T> & string],
>(
  type: T | null,
  cols: Cols,
  { sortCol, sortDirection, colForSet }: OptsWithoutSet<T> | OptsWithSet<T> = {},
): RetArr<T, Cols> | RetSet<T, Cols, keyof Entity<T>> {
  const entities = useAllEntities(type);
  return useGlobalMemo(
    `useEntitiesMap:${type},${cols.join(', ')}`,
    () => {
      const obj = new Map() as ArrMap<T> | SetMap<T>;
      for (const ent of entities.values()) {
        let obj2 = obj;
        for (const col of cols.slice(0, -1)) {
          // Maybe change to use a symbol for null.
          const tmp = ent[col] === null ? 'null' : ent[col];
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

        const lastCol = cols.at(-1);
        // @ts-expect-error entity field
        const tmp = ent[lastCol] === null ? 'null' : ent[lastCol];
        const lastVal = process.env.PRODUCTION
          ? tmp as string | number
          : TS.assertType<string | number>(
            tmp,
            v => typeof v === 'string' || typeof v === 'number',
          );
        if (colForSet) {
          const setMap = obj2 as Map<string | number, Stable<Set<any>>>;
          const tempSet = setMap.get(lastVal) ?? (new Set() as Stable<Set<any>>);
          setMap.set(lastVal, tempSet);
          tempSet.add(ent[colForSet]);
        } else {
          const arrMap = obj2 as Map<string | number, Stable<Entity<T>[]> >;
          const tempArr = arrMap.get(lastVal) ?? ([] as unknown as Stable<Entity<T>[]>);
          arrMap.set(lastVal, tempArr);
          tempArr.push(ent);
        }
      }

      if (!colForSet && sortCol) {
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
              a[sortCol] === b[sortCol]
                ? 0
                : (a[sortCol] > b[sortCol]
                  ? multiplier
                  : -1 * multiplier)
            ));
          }
        }
      }

      return obj as RetArr<T, Cols> | RetSet<T, Cols, keyof Entity<T>>;
    },
    [entities, cols.join(',')],
  );
}

export default useEntitiesMap;

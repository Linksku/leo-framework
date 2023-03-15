type ObjArr<T extends EntityType> = Partial<{
  [k: string]: Memoed<Memoed<TypeToEntity<T>>[]> | ObjArr<T>;
}>;

type ObjSet<T extends EntityType> = Partial<{
  [k: string]: Memoed<Set<Memoed<any>>> | ObjSet<T>;
}>;

export type OptsWithoutSet<T extends EntityType> = {
  sortField?: keyof TypeToEntity<T>,
  sortDirection?: 'desc' | 'asc',
  fieldForSet?: never,
};

export type OptsWithSet<T extends EntityType> = {
  sortField?: keyof TypeToEntity<T>,
  sortDirection?: 'desc' | 'asc',
  fieldForSet: keyof TypeToEntity<T>,
};

type RetArr<
  T extends EntityType,
  Fields extends readonly any[],
> = Fields extends readonly [any, ...infer R]
  ? Memoed<ObjectOf<RetArr<T, R>>>
  : Memoed<TypeToEntity<T>[]>;

type RetSet<
  T extends EntityType,
  Fields extends readonly any[],
> = Fields extends readonly [any, ...infer R]
  ? Memoed<ObjectOf<RetSet<T, R>>>
  : Memoed<Set<any>>;

function useEntitiesByFields<T extends EntityType, Fields extends readonly string[]>(
  type: T | null,
  fields: Fields,
  opts?: OptsWithoutSet<T>,
): RetArr<T, Fields>;

function useEntitiesByFields<T extends EntityType, Fields extends readonly string[]>(
  type: T | null,
  fields: Fields,
  opts?: OptsWithSet<T>,
): RetSet<T, Fields>;

function useEntitiesByFields<
  T extends EntityType,
  Fields extends readonly (keyof TypeToEntity<T>)[],
>(
  type: T | null,
  fields: Fields,
  { sortField, sortDirection, fieldForSet }: OptsWithoutSet<T> | OptsWithSet<T> = {},
) {
  const entities = useAllEntities(type);
  const entitiesByFields = useGlobalMemo(
    `useEntitiesByFields:${type},${fields.join(', ')}`,
    () => {
      const obj = Object.create(null) as ObjArr<T> | ObjSet<T>;
      for (const e of TS.objValues(entities)) {
        let obj2 = obj;
        for (const field of fields.slice(0, -1)) {
          // Maybe change to use a symbol for null.
          const val = TS.assertType<string | number>(
            e[field] === null ? 'null' : e[field],
            v => typeof v === 'string' || typeof v === 'number',
          );
          if (!obj2[val]) {
            obj2[val] = Object.create(null);
          }
          obj2 = obj2[val] as ObjArr<T> | ObjSet<T>;
        }

        const lastField = fields[fields.length - 1];
        const lastVal = TS.assertType<string | number>(
          (e as any)[lastField] === null ? 'null' : (e as any)[lastField],
          v => typeof v === 'string' || typeof v === 'number',
        );
        if (fieldForSet) {
          const tempSet = (obj2[lastVal] ?? new Set()) as Memoed<Set<Memoed<any>>>;
          obj2[lastVal] = tempSet;
          tempSet.add(e[fieldForSet]);
        } else {
          const tempArr = (obj2[lastVal] ?? []) as Memoed<Memoed<TypeToEntity<T>>[]>;
          obj2[lastVal] = tempArr;
          tempArr.push(e);
        }
      }

      if (!fieldForSet && sortField) {
        const multiplier = sortDirection === 'desc' ? -1 : 1;
        const stack = [obj as ObjArr<T>];
        while (stack.length) {
          const obj2 = stack.shift();
          if (Array.isArray(obj2)) {
            obj2.sort((a, b) => (
              a[sortField] > b[sortField]
                ? multiplier
                : -1 * multiplier
            ));
          } else if (obj2) {
            for (const val of Object.values(obj2)) {
              stack.push(val as ObjArr<T>);
            }
          }
        }
      }

      return obj as RetArr<T, Fields> | RetSet<T, Fields>;
    },
    [entities, fields.join(',')],
  );

  return entitiesByFields;
}

export default useEntitiesByFields;

type ObjArr<T extends EntityType> = {
  [k: string]: Memoed<Memoed<TypeToEntity<T>>[]> | ObjArr<T>;
}

type ObjSet<T extends EntityType> = {
  [k: string]: Memoed<Set<Memoed<any>>> | ObjSet<T>;
}

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
  Fields extends readonly any[]
> = Fields extends readonly [any, ...infer R]
  ? { [k: string]: RetArr<T, R> }
  : Memoed<TypeToEntity<T>[]>;

type RetSet<
  T extends EntityType,
  Fields extends readonly any[]
> = Fields extends readonly [any, ...infer R]
  ? { [k: string]: RetSet<T, R> }
  : Memoed<Set<any>>;

function useEntitiesByFields<T extends EntityType, Fields extends readonly string[]>(
  type: T,
  fields: Memoed<Fields>,
  opts?: OptsWithoutSet<T>,
): Memoed<RetArr<T, Fields>>;

function useEntitiesByFields<T extends EntityType, Fields extends readonly string[]>(
  type: T,
  fields: Memoed<Fields>,
  opts?: OptsWithSet<T>,
): Memoed<RetSet<T, Fields>>;

function useEntitiesByFields<
  T extends EntityType,
  Fields extends readonly(keyof TypeToEntity<T>)[]
>(
  type: T,
  fields: Memoed<Fields>,
  { sortField, sortDirection, fieldForSet }: OptsWithoutSet<T> | OptsWithSet<T> = {}) {
  const entities = useEntities(type);
  const entitiesByFields = useGlobalMemo(
    `useEntitiesByFields:${type},${fields.join(', ')}`,
    () => {
      const obj = Object.create(null) as ObjArr<T> | ObjSet<T>;
      for (const e of Object.values(entities)) {
        let obj2 = obj;
        for (const field of fields.slice(0, -1)) {
          const val = e[field] as unknown as string;
          if (!obj2[val]) {
            obj2[val] = Object.create(null);
          }
          obj2 = obj2[val] as ObjArr<T> | ObjSet<T>;
        }

        const lastField = fields[fields.length - 1];
        const lastVal = e[lastField] as unknown as string;
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
            for (const k of Object.keys(obj2)) {
              stack.push(obj2[k] as ObjArr<T>);
            }
          }
        }
      }

      return obj as RetArr<T, Fields> | RetSet<T, Fields>;
    },
    [entities, fields],
  );

  return entitiesByFields;
}

export default useEntitiesByFields;

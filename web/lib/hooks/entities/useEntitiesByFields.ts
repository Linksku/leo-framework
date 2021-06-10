interface RetArr<T extends EntityType> {
  [key: string]: Memoed<TypeToEntity<T>[]> | RetArr<T>;
}

interface RetSet<T extends EntityType> {
  [key: string]: Memoed<Set<any>> | RetSet<T>;
}

export type OptsWithoutSet = {
  sortField?: string,
  sortDirection?: 'desc' | 'asc',
  fieldForSet?: never,
};

export type OptsWithSet = {
  sortField?: string,
  sortDirection?: 'desc' | 'asc',
  fieldForSet: string,
};

function useEntitiesByFields<T extends EntityType>(
  type: T,
  fields: Memoed<string[]>,
  opts?: OptsWithoutSet,
): Memoed<RetArr<T>>;

function useEntitiesByFields<T extends EntityType>(
  type: T,
  fields: Memoed<string[]>,
  opts?: OptsWithSet,
): Memoed<RetSet<T>>;

function useEntitiesByFields<T extends EntityType>(
  type: T,
  fields: Memoed<string[]>,
  { sortField, sortDirection, fieldForSet }: OptsWithoutSet | OptsWithSet = {},
) {
  const entities = useEntities(type);
  const entitiesByFields = useGlobalMemo(
    `useEntitiesByFields(${type}, ${fields.join(', ')})`,
    () => {
      const obj = Object.create(null);
      for (const e of Object.values(entities)) {
        const obj2 = obj;
        for (const field of fields.slice(0, -1)) {
          if (!obj2[e[field]]) {
            obj2[e[field]] = Object.create(null);
          }
        }
        const lastField = fields[fields.length - 1];
        if (!obj[e[lastField]]) {
          obj[e[lastField]] = [];
        }
        obj[e[lastField]].push(e);
      }

      if (fieldForSet) {
        for (const k of Object.keys(obj)) {
          obj[k] = new Set(obj[k].map(e => e[fieldForSet]));
        }
      } else if (sortField) {
        const multiplier = sortDirection === 'desc' ? -1 : 1;
        for (const k of Object.keys(obj)) {
          obj[k] = obj[k].sort((a, b) => (
            a[sortField] > b[sortField]
              ? multiplier
              : -1 * multiplier
          ));
        }
      }

      return obj;
    },
    [entities, fields],
  );

  return entitiesByFields;
}

export default useEntitiesByFields;

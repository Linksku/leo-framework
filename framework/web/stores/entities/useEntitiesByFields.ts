import emptyArrAtom from 'atoms/emptyArrAtom';

export default function useEntitiesByFields<
  T extends EntityType | null,
>(
  type: T,
  fields: T extends EntityType
    ? Stable<Partial<Entity<T>>> | null
    : null,
): Stable<T extends EntityType ? Entity<T>[] : never[]> {
  const { getEntitiesAtom } = useEntitiesIndexStore();
  const entities = useAtomValue(
    type && fields
      ? getEntitiesAtom(type, fields as ObjectOf<any>)
      : emptyArrAtom,
  );

  return entities as Stable<T extends EntityType ? Entity<T>[] : never[]>;
}

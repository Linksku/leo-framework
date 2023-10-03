import { getEntitiesState } from 'stores/EntitiesStore';

export default function useGetEntity<T extends EntityType>(
  type: T,
): Stable<
  (id: Nullish<EntityId | (string | number)[]>) => Entity<T> | null
> {
  return useCallback(
    (_id: Nullish<EntityId | (string | number)[]>) => {
      const id = Array.isArray(_id) ? _id.join(',') : _id;
      return id
        ? (getEntitiesState().get(type)?.get(id) ?? null) as Entity<T> | null
        : null;
    },
    [type],
  );
}

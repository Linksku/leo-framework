import { getEntitiesState, EntitiesUsage } from 'stores/EntitiesStore';

export default function useGetEntity<T extends EntityType>(
  type: T,
): Stable<
  (id: Nullish<EntityId | (string | number)[]>) => Entity<T> | null
> {
  return useCallback(
    (_id: Nullish<EntityId | (string | number)[]>) => {
      const id = Array.isArray(_id) ? _id.join(',') : _id;
      const entity = id
        ? (getEntitiesState().get(type)?.get(id) ?? null) as Entity<T> | null
        : null;

      if (!process.env.PRODUCTION) {
        const usage = entity && EntitiesUsage.get(entity);
        if (usage) {
          usage.lastReadTime = performance.now();
        }
      }

      return entity;
    },
    [type],
  );
}

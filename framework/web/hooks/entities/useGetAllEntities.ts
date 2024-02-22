import type { EntitiesMap } from 'stores/EntitiesStore';
import { getEntitiesState, EntitiesUsage } from 'stores/EntitiesStore';

export default function useGetAllEntities<T extends EntityType>(
  type: T | null,
): Stable<
  () => EntitiesMap<Entity<T>>
> {
  return useCallback(
    () => {
      const allEntities = type
        ? getEntitiesState().get(type) ?? EMPTY_MAP
        : EMPTY_MAP;

      if (!process.env.PRODUCTION && allEntities) {
        for (const entity of allEntities.values()) {
          const usage = entity && EntitiesUsage.get(entity);
          if (usage) {
            usage.lastReadTime = performance.now();
          }
        }
      }

      return allEntities as EntitiesMap<Entity<T>>;
    },
    [type],
  );
}

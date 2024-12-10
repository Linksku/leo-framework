import type { EntitiesMap } from 'stores/entities/EntitiesStore';
import { entitiesMapsFamily, EntitiesUsage } from 'stores/entities/EntitiesStore';

const emptyMapAtom = atom(new Map());

export default function useAllEntities<T extends EntityType>(
  entityType: T | null,
): EntitiesMap<Entity<T>> {
  const allEntities = useAtomValue(
    entityType ? entitiesMapsFamily(entityType) : emptyMapAtom,
  ) as EntitiesMap<Entity<T>>;

  if (!process.env.PRODUCTION && allEntities) {
    for (const entity of allEntities.values()) {
      const usage = entity && EntitiesUsage.get(entity);
      if (usage) {
        usage.lastReadTime = performance.now();
      }
    }
  }

  return allEntities;
}

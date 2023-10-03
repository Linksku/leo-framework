import type { EntitiesMap } from 'stores/EntitiesStore';
import { getEntitiesState } from 'stores/EntitiesStore';

export default function useGetAllEntities<T extends EntityType>(
  type: T | null,
): Stable<
  () => EntitiesMap<Entity<T>>
> {
  return useCallback(
    () => ((
      type
        ? getEntitiesState().get(type) ?? EMPTY_MAP
        : EMPTY_MAP
    ) as EntitiesMap<Entity<T>>),
    [type],
  );
}

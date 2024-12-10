import { EntitiesUsage, entitiesFamily } from 'stores/entities/EntitiesStore';
import isDebug from 'utils/isDebug';
import useCheckEntityExists from './useCheckEntityExists';

export default function useEntity<T extends EntityType>(
  entityType: T | null,
  _id: Nullish<EntityId | (string | number)[]>,
): Entity<T> | null {
  const id = Array.isArray(_id) ? _id.join(',') : _id;
  useDebugValue(`${entityType},${id}`);

  const entity = useAtomValue(entitiesFamily(`${entityType},${id}`)) as Entity<T> | null;

  if (!process.env.PRODUCTION) {
    const usage = entity && EntitiesUsage.get(entity);
    if (usage) {
      usage.lastReadTime = performance.now();
    }

    if (isDebug) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const partial = useMemo(() => (id ? { id } as ObjectOf<ApiEntityId> : null), [id]);
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useCheckEntityExists(
        entityType,
        partial,
        entity,
      );
    }
  }

  return entity;
}

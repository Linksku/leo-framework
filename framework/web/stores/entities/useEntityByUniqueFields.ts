import emptyArrAtom from 'atoms/emptyArrAtom';
import isDebug from 'utils/isDebug';
import useCheckEntityExists from './useCheckEntityExists';
import { EntitiesUsage } from './EntitiesStore';

export default function useEntityByUniqueFields<
  T extends EntityType,
>(
  type: T | null,
  fields: T extends EntityType
    ? Stable<Partial<Entity<T>>> | null
    : null,
  opts?: {
    skipCheckEntityExists?: boolean,
  },
): T extends EntityType ? Stable<Entity<T>> | null : null {
  const { getEntitiesAtom } = useEntitiesIndexStore();
  const entities = useAtomValue(
    type && fields
      ? getEntitiesAtom(type, fields as ObjectOf<any>)
      : emptyArrAtom,
  );
  const entity = entities[0] ?? null;

  if (!process.env.PRODUCTION) {
    const usage = entity && EntitiesUsage.get(entity);
    if (usage) {
      usage.lastReadTime = performance.now();
    }
  }

  if (!process.env.PRODUCTION && isDebug && !opts?.skipCheckEntityExists) {
    if (entities.length > 1) {
      ErrorLogger.warn(new Error(`useEntityByUniqueFields(${type}): multiple matches`), { entities });
    }

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useCheckEntityExists(
      type,
      fields as Stable<ObjectOf<any>>,
      entity,
    );
  }

  return entity as T extends EntityType ? Stable<Entity<T>> | null : null;
}

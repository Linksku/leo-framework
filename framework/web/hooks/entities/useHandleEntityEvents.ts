import type { EntityEventHandler } from 'stores/EntitiesStore';

export type EntityEvents<T extends EntityType> = Stable<{
  actionType: EntityAction,
  entityType: T,
  id?: EntityId,
  cb?: EntityEventHandler<T>,
}[]>;

export default function useHandleEntityEvents<T extends EntityType>(
  events: EntityEvents<T>,
  cb: Stable<EntityEventHandler<T>>,
) {
  const { addEntityListener } = useEntitiesStore();
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    if (events.length) {
      for (const {
        actionType,
        entityType,
        id,
        cb: cb2,
      } of events) {
        if (id) {
          unsubs.push(addEntityListener(actionType, entityType, id, cb));
        } else {
          unsubs.push(addEntityListener(actionType, entityType, cb2 ?? cb));
        }
      }
    }

    return () => {
      for (const unsub of unsubs) {
        unsub();
      }
    };
  }, [addEntityListener, events, cb]);
}

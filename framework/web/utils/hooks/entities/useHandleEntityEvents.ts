import type { EntityEventHandler } from 'stores/EntitiesStore';

export type EntityEvent = {
  actionType: EntityAction,
  entityType: EntityType,
  id?: EntityId,
  cb?: EntityEventHandler<EntityType>,
};

export type EntityEvents = Memoed<EntityEvent[]>;

export default function useHandleEntityEvents(
  events: EntityEvents,
  cb: Memoed<EntityEventHandler<EntityType>>,
) {
  const { addEntityListener } = useEntitiesStore();
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    if (events.length) {
      for (const { actionType, entityType, id, cb: cb2 } of events) {
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

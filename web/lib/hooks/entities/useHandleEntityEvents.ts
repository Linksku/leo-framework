import type { ActionType, EntityEventHandler } from 'stores/EntitiesStore';

export type EntityEvents = Memoed<{
  actionType: ActionType,
  entityType: EntityType,
  id?: EntityId,
}[]>;

export default function useHandleEntityEvents(
  events: EntityEvents,
  cb: Memoed<EntityEventHandler<EntityType>>,
) {
  const { addEntityListener } = useEntitiesStore();
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    if (events.length) {
      for (const { actionType, entityType, id } of events) {
        if (id) {
          unsubs.push(addEntityListener(actionType, entityType, id, cb));
        } else {
          unsubs.push(addEntityListener(actionType, entityType, cb));
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

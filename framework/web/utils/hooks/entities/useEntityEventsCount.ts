import useUpdate from 'utils/hooks/useUpdate';
import type { EntityEvents } from './useHandleEntityEvents';
import useHandleEntityEvents from './useHandleEntityEvents';

export default function useEntityEventsCount<T extends EntityType>(
  events: EntityEvents<T>,
): number {
  const { eventsCountRef } = useEntitiesStore();
  const update = useUpdate();

  useHandleEntityEvents(
    events,
    update,
  );

  return events.reduce((sum, event) => {
    if (event.id) {
      return sum + (eventsCountRef.current[event.actionType]?.[event.entityType]?.[event.id] ?? 0);
    }
    return sum + (eventsCountRef.current[event.actionType]?.[event.entityType]?.total ?? 0);
  }, 0);
}

import useUpdate from 'hooks/useUpdate';
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
    const eventsCounts = eventsCountRef.current[event.actionType]?.get(event.entityType);
    if (event.id) {
      return sum + (eventsCounts?.get(event.id) ?? 0);
    }
    return sum + (eventsCounts?.get('total') ?? 0);
  }, 0);
}

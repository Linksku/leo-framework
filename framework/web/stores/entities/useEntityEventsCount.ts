import useUpdate from 'utils/useUpdate';
import { EntityEventsCounts } from 'stores/entities/EntitiesStore';
import type { EntityEvents } from './useHandleEntityEvents';
import useHandleEntityEvents from './useHandleEntityEvents';

export default function useEntityEventsCount<T extends EntityType>(
  events: EntityEvents<T>,
): number {
  const update = useUpdate();

  useHandleEntityEvents(
    events,
    update,
  );

  return events.reduce((sum, event) => {
    const eventsCounts = EntityEventsCounts[event.actionType]?.get(event.entityType);
    if (event.id) {
      return sum + (eventsCounts?.get(event.id) ?? 0);
    }
    return sum + (eventsCounts?.get('total') ?? 0);
  }, 0);
}

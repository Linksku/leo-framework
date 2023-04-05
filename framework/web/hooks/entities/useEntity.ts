import { useSyncExternalStore } from 'react';

import { API_TIMEOUT } from 'settings';
import useTimeout from 'hooks/useTimeout';

function useCheckEntityExists(
  entityType: EntityType,
  id: Nullish<EntityId>,
  entity: Entity | null,
) {
  const [waited, setWaited] = useState(false);

  useApi(
    'checkEntityExists',
    useMemo(() => ({
      entityType,
      entityId: id ?? '',
    }), [entityType, id]),
    {
      shouldFetch: waited && id != null && !entity,
      onFetch({ exists }) {
        if (exists && !entity) {
          ErrorLogger.warn(new Error(`checkEntityExists: ${entityType}.${id} exists, but not available in client`));
        }
      },
    },
  );

  useTimeout(
    useCallback(() => {
      if (!waited && id != null && !entity) {
        setWaited(true);
      }
    }, [waited, id, entity]),
    API_TIMEOUT,
  );
}

export default function useEntity<T extends EntityType>(
  entityType: T,
  _id: Nullish<EntityId | (string | number)[]>,
): Memoed<TypeToEntity<T>> | null {
  const id = Array.isArray(_id) ? _id.join(',') : _id;
  const { entitiesRef, addEntityListener } = useEntitiesStore();

  const entity = useSyncExternalStore(
    useCallback(cb => {
      if (!entityType || id == null) {
        return NOOP;
      }

      const unsubs = [
        addEntityListener('load', entityType, id, cb),
        addEntityListener('create', entityType, id, cb),
        addEntityListener('update', entityType, id, cb),
        addEntityListener('delete', entityType, id, cb),
      ];
      return () => {
        for (const unsub of unsubs) {
          unsub();
        }
      };
    }, [addEntityListener, entityType, id]),
    () => (id
      ? (entitiesRef.current[entityType]?.[id] ?? null) as unknown as Memoed<TypeToEntity<T>> | null
      : null),
  );

  if (!process.env.PRODUCTION && !!window.localStorage.getItem('DEBUG')) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useCheckEntityExists(
      entityType,
      id,
      entity,
    );
  }

  return entity;
}

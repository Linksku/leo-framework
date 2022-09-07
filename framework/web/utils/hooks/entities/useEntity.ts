import useHandleEntityEvents from 'utils/hooks/entities/useHandleEntityEvents';
import useUpdate from 'utils/hooks/useUpdate';
import { HTTP_TIMEOUT } from 'settings';
import useEffectIfReady from 'utils/hooks/useEffectIfReady';

function useCheckEntityExists(
  entityType: EntityType,
  id: Nullish<EntityId>,
  entity: Entity | null,
) {
  const [waited, setWaited] = useState(false);

  useApi(
    'checkEntityExists',
    {
      entityType,
      entityId: id ?? '',
    },
    {
      shouldFetch: waited && id != null && !entity,
      onFetch({ exists }) {
        if (exists && !entity) {
          ErrorLogger.warn(new Error(`checkEntityExists: ${entityType}.${id} exists, but not available in client`));
        }
      },
    },
  );

  // todo: low/easy add useTimeout/useInterval
  useEffectIfReady(() => {
    const timer = setTimeout(() => {
      setWaited(true);
    }, HTTP_TIMEOUT);

    return () => {
      clearTimeout(timer);
    };
  }, [], !waited && id != null && !entity);
}

export default function useEntity<T extends EntityType>(
  entityType: T,
  _id: Nullish<EntityId | (string | number)[]>,
): Memoed<TypeToEntity<T>> | null {
  const id = Array.isArray(_id) ? _id.join(',') : _id;
  const { entitiesRef } = useEntitiesStore();
  const update = useUpdate();

  useHandleEntityEvents(
    useMemo(() => (
      id == null
        ? []
        : [
          { actionType: 'load', entityType, id },
          { actionType: 'create', entityType, id },
          { actionType: 'update', entityType, id },
          { actionType: 'delete', entityType, id },
        ]
    ), [entityType, id]),
    update,
  );

  const entity = id
    ? (entitiesRef.current[entityType]?.[id] ?? null) as unknown as Memoed<TypeToEntity<T>> | null
    : null;

  if (!process.env.PRODUCTION) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useCheckEntityExists(
      entityType,
      id,
      entity,
    );
  }

  return entity;
}

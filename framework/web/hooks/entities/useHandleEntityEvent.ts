import type { EntityEventHandler } from 'stores/EntitiesStore';

function useHandleEntityEvent<T extends EntityType>(
  actionType: EntityAction,
  entityType: T,
  cb: Memoed<EntityEventHandler<T>>,
): void;

function useHandleEntityEvent<T extends EntityType>(
  actionType: EntityAction,
  entityType: T,
  id: EntityId,
  cb: Memoed<EntityEventHandler<T>>,
): void;

function useHandleEntityEvent<T extends EntityType>(
  actionType: EntityAction,
  entityType: T,
  idOrCb: EntityId | Memoed<EntityEventHandler<T>>,
  cb?: Memoed<EntityEventHandler<T>>,
) {
  const { addEntityListener } = useEntitiesStore();
  useEffect(() => {
    const unsub = typeof idOrCb === 'function'
      ? addEntityListener(actionType, entityType, idOrCb)
      : addEntityListener(actionType, entityType, idOrCb, cb);

    return () => {
      unsub();
    };
  }, [addEntityListener, actionType, entityType, idOrCb, cb]);
}

export default useHandleEntityEvent;

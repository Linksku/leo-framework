import type { EntityEventHandler } from 'stores/EntitiesStore';

function useHandleEntityEvent<T extends EntityType>(
  actionType: EntityAction,
  entityType: T,
  cb: Stable<EntityEventHandler<T>>,
): void;

function useHandleEntityEvent<T extends EntityType>(
  actionType: EntityAction,
  entityType: T,
  id: EntityId,
  cb: Stable<EntityEventHandler<T>>,
): void;

function useHandleEntityEvent<T extends EntityType>(
  actionType: EntityAction,
  entityType: T,
  idOrCb: EntityId | Stable<EntityEventHandler<T>>,
  cb?: Stable<EntityEventHandler<T>>,
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

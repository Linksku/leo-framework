import useUpdate from 'lib/hooks/useUpdate';
import equal from 'fast-deep-equal';

import EntitiesEventEmitter from 'lib/singletons/EntitiesEventEmitter';

type ActionType = 'load' | 'create' | 'update' | 'delete';

export type EntityEventHandler<T extends EntityType> = (ent: TypeToEntity<T>) => void;

function hasChangedExtrasKeys(oldEntity: Entity, newEntity: Entity): boolean {
  const oldExtras = oldEntity.extras;
  const newExtras = newEntity.extras;
  if (!newExtras) {
    return false;
  }
  if (!newExtras) {
    return true;
  }

  for (const [k, newVal] of objectEntries(newExtras)) {
    if (!hasDefinedProperty(oldExtras, k) || !equal(oldExtras[k], newVal)) {
      return true;
    }
  }

  return false;
}

const [
  EntitiesProvider,
  useEntitiesStore,
  useLoadEntities,
  useCreateEntities,
  useUpdateEntities,
  useDeleteEntities,
] = constate(
  function EntitiesStore() {
    const entitiesRef = useRef(Object.create(null) as ObjectOf<
      Memoed<ObjectOf<
        Entity
      >>
    >);

    if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
      window.entities = entitiesRef.current;
    }

    // entities: [{ id, type }]
    // overwrite means replace object even if nothing changed
    const addOrUpdateEntities = useCallback((
      entities: Entity | Entity[],
      overwrite = false,
    ) => {
      if (!entities || (Array.isArray(entities) && !entities.length)) {
        return [];
      }
      if (!Array.isArray(entities)) {
        entities = [entities];
      }

      const changed: Entity[] = [];
      const newEntities = Object.assign(
        Object.create(null),
        entitiesRef.current,
      );
      for (const entity of entities) {
        if (!entity.id || !entity.type) {
          ErrorLogger.warning(new Error(`EntitiesStore: invalid entity ${entity.type}, ${entity.id}`));
          continue;
        }

        if (!newEntities[entity.type]) {
          newEntities[entity.type] = Object.create(null);
        }

        if (!newEntities[entity.type][entity.id]
          || overwrite
          || hasChangedExtrasKeys(newEntities[entity.type][entity.id], entity)) {
          if (newEntities[entity.type] === entitiesRef.current[entity.type]) {
            newEntities[entity.type] = Object.assign(
              Object.create(null),
              entitiesRef.current[entity.type],
            );
          }

          if (newEntities[entity.type][entity.id]?.extras) {
            entity.extras = {
              ...newEntities[entity.type][entity.id].extras,
              ...entity.extras,
            };
          }
          newEntities[entity.type][entity.id] = entity;
          changed.push(entity);
        }
      }

      if (changed.length) {
        entitiesRef.current = newEntities;

        if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
          window.entities = entitiesRef.current;
        }
      }

      return changed;
    }, []);

    const _useLoadEntities = useCallback((entities: Entity | Entity[]) => {
      const changed = addOrUpdateEntities(entities);

      batchedUpdates(() => {
        for (const entity of changed) {
          EntitiesEventEmitter.emit(`load,${entity.type}`, entity);
          EntitiesEventEmitter.emit(`load,${entity.type},${entity.id}`, entity);
        }
      });
    }, [addOrUpdateEntities]);

    // todo: mid/hard not all returned entities are newly created
    const _useCreateEntities = useCallback((entities: Entity | Entity[]) => {
      const changed = addOrUpdateEntities(entities, true);

      batchedUpdates(() => {
        for (const entity of changed) {
          EntitiesEventEmitter.emit(`create,${entity.type}`, entity);
          EntitiesEventEmitter.emit(`create,${entity.type},${entity.id}`, entity);
        }
      });
    }, [addOrUpdateEntities]);

    const _useUpdateEntities = useCallback((entities: Entity | Entity[]) => {
      const changed = addOrUpdateEntities(entities, true);

      batchedUpdates(() => {
        for (const entity of changed) {
          EntitiesEventEmitter.emit(`update,${entity.type}`, entity);
          EntitiesEventEmitter.emit(`update,${entity.type},${entity.id}`, entity);
        }
      });
    }, [addOrUpdateEntities]);

    const _useDeleteEntities = useCallback(<T extends EntityType>(
      type: T,
      shouldDelete: (e: TypeToEntity<T>) => boolean,
    ) => {
      if (!entitiesRef.current[type]) {
        return;
      }

      const entitiesOfType = entitiesRef.current[type] as unknown as ObjectOf<
        Memoed<TypeToEntity<T>>
      >;
      const deleteEntities = objectValues(entitiesOfType)
        .filter(e => shouldDelete(e));
      if (!deleteEntities.length) {
        return;
      }

      const newEntities = Object.assign(
        Object.create(null),
        entitiesRef.current[type],
      );
      for (const entity of deleteEntities) {
        delete newEntities[entity.id];
      }
      entitiesRef.current = Object.assign(
        Object.create(null),
        entitiesRef.current,
        { [type]: newEntities },
      );

      if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
        window.entities = entitiesRef.current;
      }

      batchedUpdates(() => {
        for (const entity of deleteEntities) {
          EntitiesEventEmitter.emit(`delete,${type}`, entity);
          EntitiesEventEmitter.emit(`delete,${type},${entity.id}`, entity);
        }
      });
    }, []);

    const addEntityListener = useCallback(<T extends EntityType>(
      action: ActionType,
      type: T,
      _id: EntityId | EntityEventHandler<T>,
      _cb?: EntityEventHandler<T>,
    ) => {
      const cb = _id instanceof Function ? _id : _cb as EntityEventHandler<T>;
      const id = _id instanceof Function ? null : _id;

      const key = id ? `${action},${type},${id}` : `${action},${type}`;
      EntitiesEventEmitter.on(key, cb);

      return () => {
        EntitiesEventEmitter.off(key, cb);
      };
    }, []);

    const removeEntityListener = useCallback(<T extends EntityType>(
      action: ActionType,
      type: T,
      _id: EntityId | EntityEventHandler<T>,
      _cb?: EntityEventHandler<T>,
    ) => {
      const cb = _id instanceof Function ? _id : _cb as EntityEventHandler<T>;
      const id = _id instanceof Function ? null : _id;

      const key = id ? `${action},${type},${id}` : `${action},${type}`;
      EntitiesEventEmitter.off(key, cb);
    }, []);

    return useDeepMemoObj({
      entitiesRef,
      addEntityListener,
      removeEntityListener,
      _useLoadEntities,
      _useCreateEntities,
      _useUpdateEntities,
      _useDeleteEntities,
    });
  },
  function EntitiesStore(val) {
    return val;
  },
  function LoadEntities(val) {
    return val._useLoadEntities;
  },
  function CreateEntities(val) {
    return val._useCreateEntities;
  },
  function UpdateEntities(val) {
    return val._useUpdateEntities;
  },
  function DeleteEntities(val) {
    return val._useDeleteEntities;
  },
);

// high/hard this might be triggering multiple times per new entity
function useEntity<T extends EntityType>(
  type: T,
  id: Nullish<EntityId>,
): Memoed<TypeToEntity<T>> | null {
  const { entitiesRef, addEntityListener } = useEntitiesStore();
  const update = useUpdate();

  useEffect(() => {
    if (id == null) {
      // eslint-disable-next-line unicorn/no-useless-undefined
      return undefined;
    }

    const offLoad = addEntityListener('load', type, id, update);
    const offCreate = addEntityListener('create', type, id, update);
    const offUpdate = addEntityListener('update', type, id, update);
    const offDelete = addEntityListener('delete', type, id, update);

    return () => {
      offLoad();
      offCreate();
      offUpdate();
      offDelete();
    };
  }, [addEntityListener, type, id, update]);

  return id
    ? (entitiesRef.current[type]?.[id] as unknown as Memoed<TypeToEntity<T>>)
    : null;
}

function useRequiredEntity<T extends EntityType>(
  type: T,
  id: EntityId,
): Memoed<TypeToEntity<T>> {
  const ent = useEntity(type, id);
  if (!ent) {
    throw new Error(`Required entity ${type} not found.`);
  }

  return ent;
}

function useEntities<T extends EntityType>(type: T): Memoed<EntitiesMap<T>> {
  const { entitiesRef, addEntityListener } = useEntitiesStore();
  const update = useUpdate();

  useEffect(() => {
    const offLoad = addEntityListener('load', type, update);
    const offUpdate = addEntityListener('update', type, update);
    const offCreate = addEntityListener('create', type, update);
    const offDelete = addEntityListener('delete', type, update);

    return () => {
      offLoad();
      offCreate();
      offUpdate();
      offDelete();
    };
  }, [addEntityListener, type, update]);

  return (entitiesRef.current[type] || Object.create(null)) as Memoed<EntitiesMap<T>>;
}

export {
  EntitiesProvider,
  useEntitiesStore,
  useEntity,
  useRequiredEntity,
  useEntities,
  useLoadEntities,
  useCreateEntities,
  useUpdateEntities,
  useDeleteEntities,
};

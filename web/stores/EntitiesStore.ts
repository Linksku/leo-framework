import EntitiesData from 'lib/singletons/EntitiesData';
import EntitiesEventEmitter from 'lib/singletons/EntitiesEventEmitter';
import useForceUpdate from 'lib/hooks/useForceUpdate';

function hasNewExtrasKeys(oldEntity: Entity, newEntity: Entity): boolean {
  if (!oldEntity.extras || !newEntity.extras) {
    return false;
  }

  for (const k of Object.keys(newEntity.extras)) {
    if (!hasOwnProperty(oldEntity.extras, k)) {
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
  useEntitiesEE,
] = constate(
  function EntitiesStore() {
    const ref = useRef({
      entities: EntitiesData,
      ee: EntitiesEventEmitter,
    });

    if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
      window.entities = ref.current.entities;
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
        ref.current.entities,
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
          || hasNewExtrasKeys(newEntities[entity.type][entity.id], entity)) {
          if (newEntities[entity.type] === ref.current.entities[entity.type]) {
            newEntities[entity.type] = Object.assign(
              Object.create(null),
              ref.current.entities[entity.type],
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
        ref.current.entities = newEntities;

        if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
          window.entities = ref.current.entities;
        }
      }

      return changed;
    }, []);

    const _useLoadEntities = useCallback((entities: Entity | Entity[]) => {
      const changed = addOrUpdateEntities(entities);

      for (const entity of changed) {
        // todo: mid/mid see if batchupdates is needed
        ref.current.ee.emit(`load,${entity.type}`, entity);
        ref.current.ee.emit(`load,${entity.type},${entity.id}`, entity);
      }
    }, [addOrUpdateEntities]);

    const _useCreateEntities = useCallback((entities: Entity | Entity[]) => {
      const changed = addOrUpdateEntities(entities, true);
      for (const entity of changed) {
        ref.current.ee.emit(`create,${entity.type}`, entity);
        ref.current.ee.emit(`create,${entity.type},${entity.id}`, entity);
      }
    }, [addOrUpdateEntities]);

    const _useUpdateEntities = useCallback((entities: Entity | Entity[]) => {
      const changed = addOrUpdateEntities(entities, true);
      for (const entity of changed) {
        ref.current.ee.emit(`update,${entity.type}`, entity);
        ref.current.ee.emit(`update,${entity.type},${entity.id}`, entity);
      }
    }, [addOrUpdateEntities]);

    const _useDeleteEntities = useCallback(<T extends EntityType>(
      type: T,
      shouldDelete: (e: TypeToEntity<T>) => boolean,
    ) => {
      if (!ref.current.entities[type]) {
        return;
      }

      const entitiesOfType = ref.current.entities[type] as unknown as ObjectOf<
        Memoed<TypeToEntity<T>>
      >;
      const deleteEntities = objectValues(entitiesOfType)
        .filter(e => shouldDelete(e));
      if (!deleteEntities.length) {
        return;
      }

      const newEntities = Object.assign(
        Object.create(null),
        ref.current.entities[type],
      );
      for (const entity of deleteEntities) {
        delete newEntities[entity.id];
      }
      ref.current.entities = Object.assign(
        Object.create(null),
        ref.current.entities,
        { [type]: newEntities },
      );

      if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
        window.entities = ref.current.entities;
      }

      for (const entity of deleteEntities) {
        ref.current.ee.emit(`delete,${type}`, entity);
        ref.current.ee.emit(`delete,${type},${entity.id}`, entity);
      }
    }, []);

    return useDeepMemoObj({
      current: ref.current,
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
  function EntitiesEE(val) {
    return val.current.ee;
  },
);

function useEntity<T extends EntityType>(
  type: T,
  id: Nullish<EntityId>,
): Memoed<TypeToEntity<T>> | null {
  const { current } = useEntitiesStore();
  const forceUpdate = useForceUpdate();
  const ref = useRef({
    mounted: false,
  });

  const delayedForceUpdate = useCallback(() => {
    setTimeout(() => {
      if (ref.current.mounted) {
        forceUpdate();
      }
    }, 0);
  }, [forceUpdate]);

  useEffect(() => {
    ref.current.mounted = true;
    if (id == null) {
      return;
    }

    current.ee.on(`load,${type},${id}`, delayedForceUpdate);
    current.ee.on(`create,${type},${id}`, delayedForceUpdate);
    current.ee.on(`update,${type},${id}`, delayedForceUpdate);
    current.ee.on(`delete,${type},${id}`, delayedForceUpdate);

    // eslint-disable-next-line consistent-return
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      ref.current.mounted = false;
      current.ee.off(`load,${type},${id}`, delayedForceUpdate);
      current.ee.off(`create,${type},${id}`, delayedForceUpdate);
      current.ee.off(`update,${type},${id}`, delayedForceUpdate);
      current.ee.off(`delete,${type},${id}`, delayedForceUpdate);
    };
  }, [current.ee, type, id, delayedForceUpdate]);

  return id
    ? (current.entities[type]?.[id] as unknown as Memoed<TypeToEntity<T>>)
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
  const { current } = useEntitiesStore();
  const forceUpdate = useForceUpdate();

  useEffect(() => {
    current.ee.on(`load,${type}`, forceUpdate);
    current.ee.on(`update,${type}`, forceUpdate);
    current.ee.on(`create,${type}`, forceUpdate);
    current.ee.on(`delete,${type}`, forceUpdate);

    return () => {
      current.ee.off(`load,${type}`, forceUpdate);
      current.ee.off(`create,${type}`, forceUpdate);
      current.ee.off(`update,${type}`, forceUpdate);
      current.ee.off(`delete,${type}`, forceUpdate);
    };
  }, [current.ee, type, forceUpdate]);

  return (current.entities[type] || Object.create(null)) as Memoed<EntitiesMap<T>>;
}

export {
  EntitiesProvider,
  useEntity,
  useRequiredEntity,
  useEntities,
  useLoadEntities,
  useCreateEntities,
  useUpdateEntities,
  useDeleteEntities,
  useEntitiesEE,
};

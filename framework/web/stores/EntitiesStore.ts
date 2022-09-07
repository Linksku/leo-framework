import EntitiesEventEmitter from 'services/EntitiesEventEmitter';
import {
  hasNewOrChangedExtras,
  hasNewIncludedRelations,
  mergeEntityExtras,
  mergeEntityIncludedRelations,
} from 'utils/models/mergeEntityProps';
import deepFreezeIfDev from 'utils/deepFreezeIfDev';

export type EntityEventHandler<T extends EntityType> = (ent: TypeToEntity<T>) => void;

export type EntitiesMap<T extends Entity = Entity> = Memoed<ObjectOf<
  Memoed<T>
>>;

function getEventKey(action: EntityAction, type: EntityType, id?: EntityId) {
  return id ? `${action},${type},${id}` : `${action},${type}`;
}

export const [
  EntitiesProvider,
  useEntitiesStore,
  useMutateEntity,
] = constate(
  function EntitiesStore() {
    const entitiesRef = useRef(deepFreezeIfDev(
      Object.create(null) as ObjectOf<EntitiesMap>,
    ));

    const getEntities = useCallback(
      <T extends EntityType>(
        type: T,
      ) => (entitiesRef.current[type] ?? Object.create(null)) as Memoed<ObjectOf<
        Memoed<TypeToEntity<T>>
      >>,
      [],
    );

    const getEntity = useCallback(
      <T extends EntityType>(
        type: T,
        id: EntityId,
      ) => (entitiesRef.current[type]?.[id] ?? null) as TypeToEntity<T> | null,
      [],
    );

    // entities: [{ id, type }]
    // forceOverwrite means replace object even if nothing changed
    const addOrUpdateEntities = useCallback((
      entities: Entity | Entity[],
      forceOverwrite = false,
    ) => {
      if (!entities || (Array.isArray(entities) && !entities.length)) {
        return [];
      }
      if (!Array.isArray(entities)) {
        entities = [entities];
      }

      const changed: Entity[] = [];
      const newEntities = Object.assign(
        Object.create(null) as ObjectOf<EntitiesMap>,
        entitiesRef.current,
      );
      for (const entity of entities) {
        if (!entity.id || !entity.type) {
          ErrorLogger.warn(new Error(`EntitiesStore: invalid entity ${entity.type}, ${entity.id}`));
          continue;
        }

        let entitiesMap = TS.objValOrSetDefault(
          newEntities,
          entity.type,
          Object.create(null) as EntitiesMap,
        );

        const oldEntity = entitiesMap[entity.id];
        if (!oldEntity
          || forceOverwrite
          || hasNewOrChangedExtras(oldEntity.extras, entity.extras)
          || hasNewIncludedRelations(oldEntity.includedRelations, entity.includedRelations)) {
          if (entitiesMap === entitiesRef.current[entity.type]) {
            entitiesMap = Object.assign(
              Object.create(null),
              entitiesMap,
            );
            newEntities[entity.type] = entitiesMap;
          }

          if (oldEntity?.extras) {
            entity.extras = mergeEntityExtras(
              oldEntity.extras,
              entity.extras,
            );
          }
          if (oldEntity?.includedRelations) {
            entity.includedRelations = mergeEntityIncludedRelations(
              oldEntity.includedRelations,
              entity.includedRelations,
            );
          }
          entitiesMap[entity.id] = entity;
          changed.push(entity);
        }
      }

      if (changed.length) {
        entitiesRef.current = deepFreezeIfDev(newEntities);

        if (!process.env.PRODUCTION && typeof window !== 'undefined') {
          // @ts-ignore for debugging
          window.entities = entitiesRef.current;
        }
      }

      return changed;
    }, []);

    const loadEntities = useCallback((entities: Entity | Entity[]) => {
      const changed = addOrUpdateEntities(entities);

      batchedUpdates(() => {
        for (const entity of changed) {
          EntitiesEventEmitter.emit(getEventKey('load', entity.type), entity);
          EntitiesEventEmitter.emit(getEventKey('load', entity.type, entity.id), entity);
        }
      });
    }, [addOrUpdateEntities]);

    const createEntities = useCallback((entities: Entity | Entity[]) => {
      const changed = addOrUpdateEntities(entities, true);

      batchedUpdates(() => {
        for (const entity of changed) {
          EntitiesEventEmitter.emit(getEventKey('create', entity.type), entity);
          EntitiesEventEmitter.emit(getEventKey('create', entity.type, entity.id), entity);
        }
      });
    }, [addOrUpdateEntities]);

    const updateEntities = useCallback((entities: Entity | Entity[]) => {
      const changed = addOrUpdateEntities(entities, true);

      batchedUpdates(() => {
        for (const entity of changed) {
          EntitiesEventEmitter.emit(getEventKey('update', entity.type), entity);
          EntitiesEventEmitter.emit(getEventKey('update', entity.type, entity.id), entity);
        }
      });
    }, [addOrUpdateEntities]);

    const deleteEntities = useCallback(<T extends EntityType>(
      type: T,
      ids: EntityId[],
    ) => {
      const entitiesToDelete = TS.filterNulls(ids.map(id => entitiesRef.current[type]?.[id]));
      if (!entitiesToDelete.length) {
        return;
      }

      const newEntities: ObjectOf<
        Memoed<TypeToEntity<T>>
      > = Object.assign(
        Object.create(null),
        entitiesRef.current[type],
      );
      for (const entity of entitiesToDelete) {
        delete newEntities[entity.id];
      }
      entitiesRef.current = deepFreezeIfDev(Object.assign(
        Object.create(null),
        entitiesRef.current,
        { [type]: newEntities },
      ));

      if (!process.env.PRODUCTION && typeof window !== 'undefined') {
        // @ts-ignore for debugging
        window.entities = entitiesRef.current;
      }

      batchedUpdates(() => {
        for (const entity of entitiesToDelete) {
          EntitiesEventEmitter.emit(getEventKey('delete', type), entity);
          EntitiesEventEmitter.emit(getEventKey('delete', type, entity.id), entity);
        }
      });
    }, []);

    type MutateEntityUpdates<T extends EntityType> = {
      action: Exclude<EntityAction, 'update' | 'delete'>,
      entity: SetOptional<TypeToEntity<T>, 'id' | 'type'>,
    }
    | {
      action: 'update',
      partial: Partial<TypeToEntity<T>>,
    }
    | { action: 'delete' }
    | null;

    function mutateEntity<T extends EntityType>(
      type: T,
      id: EntityId,
      updater: MutateEntityUpdates<T>
        | ((ent: TypeToEntity<T> | null) => MutateEntityUpdates<T>),
    ) {
      const entity = (entitiesRef.current[type]?.[id] ?? null) as TypeToEntity<T> | null;
      const updates = typeof updater === 'function'
        ? updater(entity)
        : updater;

      if (!process.env.PRODUCTION && updates) {
        // eslint-disable-next-line no-console
        console.log(
          `mutate(${type}, ${id})`,
          updates.action,
          TS.getProp(updates, 'entity') ?? TS.getProp(updates, 'partial') ?? '',
        );
      }

      if (updates?.action === 'load') {
        loadEntities([{ id, type, ...updates.entity } as Memoed<TypeToEntity<T>>]);
      } else if (updates?.action === 'create') {
        createEntities([{ id, type, ...updates.entity } as Memoed<TypeToEntity<T>>]);
      } else if (updates?.action === 'update') {
        if (!entity) {
          if (!process.env.PRODUCTION) {
            ErrorLogger.warn(new Error(`mutateEntity(${type},${id}): entity to update not found.`));
          }
          return;
        }
        const newEntity = { ...entity, ...updates.partial } as Memoed<TypeToEntity<T>>;
        updateEntities([newEntity]);
      } else if (updates?.action === 'delete') {
        deleteEntities(type, [id]);
      }
    }

    const addEntityListener = useCallback(<T extends EntityType>(
      action: EntityAction,
      type: T,
      _id: EntityId | EntityEventHandler<T>,
      _cb?: EntityEventHandler<T>,
    ) => {
      const cb = _id instanceof Function ? _id : _cb as EntityEventHandler<T>;
      const id = _id instanceof Function ? undefined : _id;

      const key = getEventKey(action, type, id);
      EntitiesEventEmitter.on(key, cb);

      return () => {
        EntitiesEventEmitter.off(key, cb);
      };
    }, []);

    const removeEntityListener = useCallback(<T extends EntityType>(
      action: EntityAction,
      type: T,
      _id: EntityId | EntityEventHandler<T>,
      _cb?: EntityEventHandler<T>,
    ) => {
      const cb = _id instanceof Function ? _id : TS.defined(_cb);
      const id = _id instanceof Function ? undefined : _id;

      const key = getEventKey(action, type, id);
      EntitiesEventEmitter.off(key, cb);
    }, []);

    if (!process.env.PRODUCTION && typeof window !== 'undefined') {
      // @ts-ignore for debugging
      window.entities = entitiesRef.current;
      // @ts-ignore for debugging
      window.mutateEntity = mutateEntity;
    }

    return useDeepMemoObj({
      entitiesRef,
      getEntities,
      getEntity,
      addEntityListener,
      removeEntityListener,
      loadEntities,
      createEntities,
      updateEntities,
      deleteEntities,
      mutateEntity,
    });
  },
  function EntitiesStore(val) {
    return val;
  },
  function MutateEntity(val) {
    return val.mutateEntity;
  },
);

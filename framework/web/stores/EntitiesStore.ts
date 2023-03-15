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
    const eventsCountRef = useRef<Record<EntityAction, ObjectOf<ObjectOf<number>>>>({
      load: Object.create(null),
      create: Object.create(null),
      update: Object.create(null),
      delete: Object.create(null),
    });

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
    // forceUpdate means replace object even if nothing changed
    const addOrUpdateEntities = useCallback((
      entities: Entity | Entity[],
      forceUpdate = false,
    ) => {
      if (!entities || (Array.isArray(entities) && !entities.length)) {
        return { added: [], updated: [] };
      }
      if (!Array.isArray(entities)) {
        entities = [entities];
      }

      const added: Entity[] = [];
      const updated: Entity[] = [];
      let newIncludedRelations = false;
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
        const isEntityAdded = !oldEntity;
        const isEntityUpdated = !isEntityAdded && (forceUpdate
          || hasNewOrChangedExtras(oldEntity.extras, entity.extras));
        const entityNewIncludedRelations = !process.env.PRODUCTION
          && hasNewIncludedRelations(
            oldEntity?.includedRelations,
            entity.includedRelations,
          );
        if (isEntityAdded || isEntityUpdated || entityNewIncludedRelations) {
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
          if (entityNewIncludedRelations) {
            entity.includedRelations = mergeEntityIncludedRelations(
              oldEntity?.includedRelations,
              entity.includedRelations,
            );
            newIncludedRelations = true;
          }
          entitiesMap[entity.id] = entity;

          if (isEntityAdded) {
            added.push(entity);
          } else if (isEntityUpdated) {
            updated.push(entity);
          }
        }
      }

      if (added.length || updated.length || newIncludedRelations) {
        entitiesRef.current = deepFreezeIfDev(newEntities);

        if (!process.env.PRODUCTION && typeof window !== 'undefined') {
          // @ts-ignore for debugging
          window.entities = entitiesRef.current;
        }
      }

      return { added, updated };
    }, []);

    const loadEntities = useCallback((entities: Entity | Entity[]) => {
      const { added, updated } = addOrUpdateEntities(entities);

      for (const entity of [...added, ...updated]) {
        const eventsCount = TS.objValOrSetDefault(
          eventsCountRef.current.load,
          entity.type,
          Object.create(null),
        );
        eventsCount.total = (eventsCount.total ?? 0) + 1;
        eventsCount[entity.id] = (eventsCount[entity.id] ?? 0) + 1;

        EntitiesEventEmitter.emit(getEventKey('load', entity.type), entity);
        EntitiesEventEmitter.emit(getEventKey('load', entity.type, entity.id), entity);
      }
    }, [addOrUpdateEntities]);

    const createEntities = useCallback((entities: Entity | Entity[]) => {
      const { added, updated } = addOrUpdateEntities(entities, true);

      for (const entity of added) {
        const eventsCount = TS.objValOrSetDefault(
          eventsCountRef.current.create,
          entity.type,
          Object.create(null),
        );
        eventsCount.total = (eventsCount.total ?? 0) + 1;
        eventsCount[entity.id] = (eventsCount[entity.id] ?? 0) + 1;

        EntitiesEventEmitter.emit(getEventKey('create', entity.type), entity);
        EntitiesEventEmitter.emit(getEventKey('create', entity.type, entity.id), entity);
      }
      for (const entity of updated) {
        const eventsCount = TS.objValOrSetDefault(
          eventsCountRef.current.update,
          entity.type,
          Object.create(null),
        );
        eventsCount.total = (eventsCount.total ?? 0) + 1;
        eventsCount[entity.id] = (eventsCount[entity.id] ?? 0) + 1;

        EntitiesEventEmitter.emit(getEventKey('update', entity.type), entity);
        EntitiesEventEmitter.emit(getEventKey('update', entity.type, entity.id), entity);
      }
    }, [addOrUpdateEntities]);

    const updateEntities = useCallback((entities: Entity | Entity[]) => {
      const { added, updated } = addOrUpdateEntities(entities, true);

      for (const entity of [...added, ...updated]) {
        const eventsCount = TS.objValOrSetDefault(
          eventsCountRef.current.update,
          entity.type,
          Object.create(null),
        );
        eventsCount.total = (eventsCount.total ?? 0) + 1;
        eventsCount[entity.id] = (eventsCount[entity.id] ?? 0) + 1;

        EntitiesEventEmitter.emit(getEventKey('update', entity.type), entity);
        EntitiesEventEmitter.emit(getEventKey('update', entity.type, entity.id), entity);
      }
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

      for (const entity of entitiesToDelete) {
        const eventsCount = TS.objValOrSetDefault(
          eventsCountRef.current.delete,
          entity.type,
          Object.create(null),
        );
        eventsCount.total = (eventsCount.total ?? 0) + 1;
        eventsCount[entity.id] = (eventsCount[entity.id] ?? 0) + 1;

        EntitiesEventEmitter.emit(getEventKey('delete', type), entity);
        EntitiesEventEmitter.emit(getEventKey('delete', type, entity.id), entity);
      }
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

    const mutateEntity = useCallback(
      <T extends EntityType>(
        type: T,
        id: EntityId,
        updater: MutateEntityUpdates<T>
          | ((ent: TypeToEntity<T> | null) => MutateEntityUpdates<T>),
      ) => {
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

          // todo: low/easy detect missing keys
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
      },
      [loadEntities, createEntities, updateEntities, deleteEntities],
    );

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

    return useMemo(() => ({
      entitiesRef,
      eventsCountRef,
      getEntities,
      getEntity,
      addEntityListener,
      removeEntityListener,
      loadEntities,
      createEntities,
      updateEntities,
      deleteEntities,
      mutateEntity,
    }), [
      entitiesRef,
      eventsCountRef,
      getEntities,
      getEntity,
      addEntityListener,
      removeEntityListener,
      loadEntities,
      createEntities,
      updateEntities,
      deleteEntities,
      mutateEntity,
    ]);
  },
  function EntitiesStore(val) {
    return val;
  },
  function MutateEntity(val) {
    return val.mutateEntity;
  },
);

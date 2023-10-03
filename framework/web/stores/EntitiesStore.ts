import EntitiesEventEmitter from 'services/EntitiesEventEmitter';
import {
  hasNewOrChangedExtras,
  hasNewIncludedRelations,
  mergeEntityExtras,
  mergeEntityIncludedRelations,
} from 'utils/models/mergeEntityProps';

export type EntityEventHandler<T extends EntityType> =
  (
    entity: Entity<T>,
    oldEntity?: Entity<T> | null,
  ) => void;

export type EntitiesMap<T extends Entity = Entity> = Stable<Map<T['id'], T>>;

function getEventKey(action: EntityAction, type: EntityType, id?: EntityId) {
  return id ? `${action},${type},${id}` : `${action},${type}`;
}

let EntitiesState = new Map<EntityType, EntitiesMap>(null);

export function getEntitiesState() {
  return EntitiesState as Stable<Map<EntityType, EntitiesMap>>;
}

export const [
  EntitiesProvider,
  useEntitiesStore,
  useMutateEntity,
] = constate(
  function EntitiesStore() {
    const entitiesByUniqueFieldsRef = useRef(new Map<
      EntityType,
      Map<
        string, // field name
        WeakMap<
          EntitiesMap, // all entities map
          Stable<Map<any, Entity>> // field values to entities
        >
      >
    >());
    const eventsCountRef = useRef<Record<
      EntityAction,
      Map<EntityType, Map<EntityId, number>>
    >>({
      load: new Map(),
      create: new Map(),
      update: new Map(),
      delete: new Map(),
    });
    const entitiesEmittedCreate = useRef(new Map<EntityType, Set<EntityId>>());

    const getEntities = useCallback(
      <T extends EntityType>(type: T): EntitiesMap<Entity<T>> => (
        EntitiesState.get(type) ?? new Map()
      ) as EntitiesMap<Entity<T>>,
      [],
    );

    const getEntity = useCallback(
      <T extends EntityType>(type: T, id: EntityId): Entity<T> | null => (
        EntitiesState.get(type)?.get(id) ?? null
      ) as Entity<T> | null,
      [],
    );

    // forceUpdate means replace object even if nothing changed
    const addOrUpdateEntities = useCallback(({ entities, action, forceUpdate }: {
      entities: ModelSerializedForApi | ModelSerializedForApi[],
      action: EntityAction,
      forceUpdate?: boolean,
    }) => {
      if (!entities || (Array.isArray(entities) && !entities.length)) {
        return;
      }
      if (!Array.isArray(entities)) {
        entities = [entities];
      }

      const updated: { oldEntity: Entity | null, entity: Entity }[] = [];
      let newIncludedRelations = false;
      const newEntities = new Map(EntitiesState);
      for (const entity of entities) {
        if (!entity.id || !entity.type) {
          ErrorLogger.warn(new Error(`EntitiesStore: invalid entity ${entity.type}, ${entity.id}`));
          continue;
        }

        if (!newEntities.has(entity.type)) {
          newEntities.set(entity.type, markStable(new Map()));
        }
        let entitiesMap = newEntities.get(entity.type) as EntitiesMap;

        const oldEntity = entitiesMap.get(entity.id);
        const isEntityAdded = !oldEntity;
        const isEntityUpdated = !isEntityAdded && (forceUpdate
          || hasNewOrChangedExtras(oldEntity.extras, entity.extras));
        const entityNewIncludedRelations = !process.env.PRODUCTION
          && hasNewIncludedRelations(
            oldEntity?.includedRelations,
            entity.includedRelations,
          );
        if (isEntityAdded || isEntityUpdated || entityNewIncludedRelations) {
          if (entitiesMap === EntitiesState.get(entity.type)) {
            entitiesMap = new Map(entitiesMap) as Stable<EntitiesMap>;
            newEntities.set(entity.type, entitiesMap);
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
          entitiesMap.set(entity.id, entity as Stable<Entity>);

          updated.push({
            oldEntity: oldEntity ?? null,
            entity: entity as Stable<Entity>,
          });
        }
      }

      if (updated.length || newIncludedRelations) {
        EntitiesState = newEntities;

        if (!process.env.PRODUCTION && typeof window !== 'undefined') {
          // @ts-ignore for debugging
          window.entities = EntitiesState;
        }
      }

      for (const { oldEntity, entity } of updated) {
        const eventsCount = TS.mapValOrSetDefault(
          eventsCountRef.current[action],
          entity.type,
          new Map(),
        );
        eventsCount.set('total', (eventsCount.get('total') ?? 0) + 1);
        eventsCount.set(entity.id, (eventsCount.get(entity.id) ?? 0) + 1);

        const emitAction = action === 'create'
          && entitiesEmittedCreate.current.get(entity.type)?.has(entity.id)
          ? 'update'
          : action;
        if (emitAction === 'update') {
          EntitiesEventEmitter.emit(
            getEventKey(emitAction, entity.type),
            entity,
            oldEntity,
          );
          EntitiesEventEmitter.emit(
            getEventKey(emitAction, entity.type, entity.id),
            entity,
            oldEntity,
          );
        } else {
          EntitiesEventEmitter.emit(getEventKey(emitAction, entity.type), entity);
          EntitiesEventEmitter.emit(getEventKey(emitAction, entity.type, entity.id), entity);
        }
        if (action === 'create') {
          TS.mapValOrSetDefault(
            entitiesEmittedCreate.current,
            entity.type,
            new Set(),
          )
            .add(entity.id);
        }
      }
    }, []);

    // todo: mid/mid warn if loaded entity is unused
    const loadEntities = useCallback((
      entities: ModelSerializedForApi | ModelSerializedForApi[],
    ) => {
      addOrUpdateEntities({
        entities,
        action: 'load',
      });
    }, [addOrUpdateEntities]);

    // Note: it's possible for newly created entity to be fetched via load before via create
    const createEntities = useCallback((
      entities: ModelSerializedForApi | ModelSerializedForApi[],
    ) => {
      addOrUpdateEntities({
        entities,
        action: 'create',
        forceUpdate: true,
      });
    }, [addOrUpdateEntities]);

    const updateEntities = useCallback((
      entities: ModelSerializedForApi | ModelSerializedForApi[],
    ) => {
      addOrUpdateEntities({
        entities,
        action: 'update',
        forceUpdate: true,
      });
    }, [addOrUpdateEntities]);

    const deleteEntities = useCallback(<T extends EntityType>(
      type: T,
      ids: EntityId[],
    ) => {
      const entitiesToDelete = TS.filterNulls(ids.map(
        id => EntitiesState.get(type)?.get(id),
      ));
      if (!entitiesToDelete.length) {
        return;
      }

      const entitiesMap = markStable(new Map(EntitiesState.get(type)));
      for (const entity of entitiesToDelete) {
        entitiesMap.delete(entity.id);
      }
      EntitiesState = new Map(EntitiesState);
      EntitiesState.set(type, entitiesMap);

      if (!process.env.PRODUCTION && typeof window !== 'undefined') {
        // @ts-ignore for debugging
        window.entities = EntitiesState;
      }

      for (const entity of entitiesToDelete) {
        const eventsCount = TS.mapValOrSetDefault(
          eventsCountRef.current.delete,
          entity.type,
          new Map(),
        );
        eventsCount.set('total', (eventsCount.get('total') ?? 0) + 1);
        eventsCount.set(entity.id, (eventsCount.get(entity.id) ?? 0) + 1);

        EntitiesEventEmitter.emit(getEventKey('delete', type), entity);
        EntitiesEventEmitter.emit(getEventKey('delete', type, entity.id), entity);
      }
    }, []);

    type MutateEntityUpdates<T extends EntityType> =
      | {
        action: Exclude<EntityAction, 'update' | 'delete'>,
        entity: SetOptional<Entity<T>, 'id' | 'type' | '__isModel'>,
      }
      | {
        action: 'update',
        partial: Partial<Entity<T>>,
      }
      | { action: 'delete' }
      | null;

    const mutateEntity = useCallback(
      <T extends EntityType>(
        type: T,
        id: EntityId,
        updater: MutateEntityUpdates<T>
          | ((ent: Entity<T> | null) => MutateEntityUpdates<T>),
      ) => {
        const entity = (EntitiesState.get(type)?.get(id) ?? null) as Entity<T> | null;
        const updates = typeof updater === 'function'
          ? updater(entity)
          : updater;

        if (!process.env.PRODUCTION && updates) {
          // eslint-disable-next-line no-console
          console.log(
            `${updates.action} ${type}.${id}:`,
            TS.getProp(updates, 'entity') ?? TS.getProp(updates, 'partial') ?? '',
          );

          // todo: low/easy detect missing keys
          // todo: mid/mid warn if entity was just fetched then updated
        }

        if (updates?.action === 'load') {
          loadEntities([{ id, type, ...updates.entity } as Entity<T>]);
        } else if (updates?.action === 'create') {
          createEntities([{ id, type, ...updates.entity } as Entity<T>]);
        } else if (updates?.action === 'update') {
          if (!entity) {
            if (!process.env.PRODUCTION) {
              ErrorLogger.warn(new Error(`mutateEntity(${type},${id}): entity to update not found.`));
            }
            return;
          }
          const newEntity = { ...entity, ...updates.partial } as Entity<T>;
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
      window.entities = EntitiesState;
      // @ts-ignore for debugging
      window.mutateEntity = mutateEntity;
    }

    return useMemo(() => ({
      entitiesByUniqueFieldsRef,
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
      entitiesByUniqueFieldsRef,
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

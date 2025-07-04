import { atomFamily, useAtomCallback } from 'jotai/utils';
import equal from 'fast-deep-equal';

import EntitiesEventEmitter from 'services/EntitiesEventEmitter';
import {
  hasNewIncludedRelations,
  mergeEntityIncludedRelations,
} from 'utils/models/mergeEntityProps';
import useTimeout from 'utils/useTimeout';
import isDebug from 'utils/isDebug';
import { DEFAULT_API_TIMEOUT } from 'consts/server';

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

export const entitiesMapsFamily = atomFamily(
  (_: EntityType) => atom(new Map() as EntitiesMap),
);

export const entitiesFamily = atomFamily(
  (_: string) => atom<Stable<Entity> | null>(null),
);

export const EntityEventsCounts: Record<
  EntityAction,
  Map<EntityType, Map<EntityId, number>>
> = {
  load: new Map(),
  create: new Map(),
  update: new Map(),
  delete: new Map(),
};

const EntitiesEmittedCreateState = new Map<EntityType, Set<EntityId>>();

export const EntitiesUsage = new WeakMap<Entity, {
  fetchTime: number,
  lastReadTime: number | null,
}>();

export const EntitiesIncludedRelations = new Map<EntityType, Map<EntityId, string[]>>();

export const [
  EntitiesProvider,
  useEntitiesStore,
  useMutateEntity,
] = constate(
  function EntitiesStore() {
    const justFetchedEntities = useRef<ModelSerializedForApi[] | null>(null);

    const setAtomEntitiesMap = markStable(useAtomCallback(useCallback(
      (
        _,
        set,
        type: EntityType,
        newEntitiesMap: EntitiesMap,
      ) => {
        set(entitiesMapsFamily(type), newEntitiesMap);
      },
      [],
    )));

    const setAtomEntity = markStable(useAtomCallback(useCallback(
      (
        _,
        set,
        type: EntityType,
        id: EntityId,
        newEntity: Entity | null,
      ) => {
        set(entitiesFamily(`${type},${id}`), newEntity);
      },
      [],
    )));

    // forceUpdate means replace object even if nothing changed
    const addOrUpdateEntities = useCallback(({ entities, action }: {
      entities: ModelSerializedForApi | ModelSerializedForApi[],
      action: EntityAction,
    }) => {
      if (!entities || (Array.isArray(entities) && !entities.length)) {
        return;
      }
      if (!Array.isArray(entities)) {
        entities = [entities];
      }

      const updated: { oldEntity: Entity | null, entity: Entity }[] = [];
      const newEntities = new Map(EntitiesState);
      for (const entity of entities) {
        if (!entity.id || !entity.type) {
          ErrorLogger.warn(new Error(`EntitiesStore: invalid entity ${entity.type}, ${entity.id}`));
          continue;
        }
        if (!process.env.PRODUCTION
          && (action === 'load' || action === 'create')
          && TS.getProp(entity, 'isDeleted') === true) {
          ErrorLogger.warn(new Error(`EntitiesStore: got deleted entity ${entity.type}, ${entity.id}`));
        }

        if (!newEntities.has(entity.type)) {
          newEntities.set(entity.type, markStable(new Map()));
        }
        let entitiesMap = newEntities.get(entity.type) as EntitiesMap;

        const includedRelations = TS.getProp(entity, 'includedRelations');
        if (includedRelations) {
          delete entity.includedRelations;
        }

        const oldEntity = entitiesMap.get(entity.id);
        const isEntityAdded = !oldEntity;
        const isEntityUpdated = !isEntityAdded
          // && (action === 'create' || action === 'update' || entity.type.startsWith('virtual'))
          && !equal(oldEntity, entity);
        if (isEntityAdded || isEntityUpdated) {
          if (entitiesMap === EntitiesState.get(entity.type)) {
            entitiesMap = new Map(entitiesMap) as Stable<EntitiesMap>;
            newEntities.set(entity.type, entitiesMap);
          }

          entitiesMap.set(entity.id, entity as Stable<Entity>);

          updated.push({
            oldEntity: oldEntity ?? null,
            entity: entity as Stable<Entity>,
          });
        }

        if (includedRelations) {
          const oldIncludedRelations = EntitiesIncludedRelations.get(entity.type)?.get(entity.id);
          const entityNewIncludedRelations = !process.env.PRODUCTION
            && hasNewIncludedRelations(oldIncludedRelations, includedRelations);
          if (isEntityAdded || isEntityUpdated || entityNewIncludedRelations) {
            const includedRelationsMap = TS.mapValOrSetDefault(
              EntitiesIncludedRelations,
              entity.type,
              new Map(),
            );
            includedRelationsMap.set(
              entity.id,
              TS.defined(mergeEntityIncludedRelations(
                oldIncludedRelations,
                includedRelations,
              )),
            );
          }
        }
      }

      if (updated.length) {
        EntitiesState = newEntities;

        if (!process.env.PRODUCTION && isDebug && typeof window !== 'undefined') {
          // @ts-expect-error for debugging
          window.entities = EntitiesState;
        }
      }

      const seenEntityTypes = new Set<EntityType>();
      for (const { oldEntity, entity } of updated) {
        if (!seenEntityTypes.has(entity.type)) {
          setAtomEntitiesMap(entity.type, TS.defined(EntitiesState.get(entity.type)));
          seenEntityTypes.add(entity.type);
        }
        setAtomEntity(entity.type, entity.id, entity);

        const eventsCount = TS.mapValOrSetDefault(
          EntityEventsCounts[action],
          entity.type,
          new Map(),
        );
        eventsCount.set('total', (eventsCount.get('total') ?? 0) + 1);
        eventsCount.set(entity.id, (eventsCount.get(entity.id) ?? 0) + 1);

        if (!process.env.PRODUCTION) {
          EntitiesUsage.set(entity, {
            fetchTime: performance.now(),
            lastReadTime: null,
          });
        }

        const emitAction = action === 'create'
          && EntitiesEmittedCreateState.get(entity.type)?.has(entity.id)
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
            EntitiesEmittedCreateState,
            entity.type,
            new Set(),
          )
            .add(entity.id);
        }
      }

      justFetchedEntities.current = entities;
      setTimeout(() => {
        justFetchedEntities.current = null;
      }, 0);
    }, [setAtomEntitiesMap, setAtomEntity]);

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
      });
    }, [addOrUpdateEntities]);

    const updateEntities = useCallback((
      entities: ModelSerializedForApi | ModelSerializedForApi[],
    ) => {
      addOrUpdateEntities({
        entities,
        action: 'update',
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
        setAtomEntity(type, entity.id, null);
      }
      EntitiesState = new Map(EntitiesState);
      EntitiesState.set(type, entitiesMap);
      setAtomEntitiesMap(type, entitiesMap);

      if (!process.env.PRODUCTION && isDebug && typeof window !== 'undefined') {
        // @ts-expect-error for debugging
        window.entities = EntitiesState;
      }

      for (const entity of entitiesToDelete) {
        const eventsCount = TS.mapValOrSetDefault(
          EntityEventsCounts.delete,
          entity.type,
          new Map(),
        );
        eventsCount.set('total', (eventsCount.get('total') ?? 0) + 1);
        eventsCount.set(entity.id, (eventsCount.get(entity.id) ?? 0) + 1);

        EntitiesEventEmitter.emit(getEventKey('delete', type), entity);
        EntitiesEventEmitter.emit(getEventKey('delete', type, entity.id), entity);
      }
    }, [setAtomEntity, setAtomEntitiesMap]);

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

          // todo: low/med detect missing keys
          // todo: med/med warn if entity was just fetched then updated
        }

        if (!process.env.PRODUCTION
          && updates
          && updates.action !== 'delete'
          && justFetchedEntities.current?.some(ent => ent.type === type && ent.id === id)) {
          ErrorLogger.warn(new Error(`mutateEntity(${type},${id}): entity was just fetched`));
        }

        if (updates?.action === 'load') {
          loadEntities([{ id, type, ...updates.entity } as Entity<T>]);
        } else if (updates?.action === 'create') {
          // todo: low/med check if entity already exists
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

    if (!process.env.PRODUCTION && isDebug) {
      if (typeof window !== 'undefined') {
        // @ts-expect-error for debugging
        window.entities = EntitiesState;
        // @ts-expect-error for debugging
        window.mutateEntity = mutateEntity;
      }

      // eslint-disable-next-line react-hooks/rules-of-hooks
      useTimeout(useCallback(() => {
        const notUsed: Entity[] = [];
        let numEntities = 0;
        for (const entities of EntitiesState.values()) {
          for (const entity of entities.values()) {
            const usage = EntitiesUsage.get(entity);
            if (usage && !usage.lastReadTime
              && performance.now() - usage.fetchTime > DEFAULT_API_TIMEOUT) {
              notUsed.push(entity);
            }
            numEntities++;
          }
        }

        if (notUsed.length && notUsed.length / numEntities > 0.1) {
          // eslint-disable-next-line no-console
          console.log(`${notUsed.length}/${numEntities} (${Math.round(notUsed.length / numEntities * 100)}%) entities not used:`, notUsed);
        } else if (!notUsed.length && numEntities) {
          // Not all entities are necessarily used, e.g. useAllEntities marks all entities as read
          // eslint-disable-next-line no-console
          console.log(`All ${numEntities} entities used.`);
        }
      }, []), DEFAULT_API_TIMEOUT * 2);
    }

    return useMemo(() => ({
      addEntityListener,
      removeEntityListener,
      loadEntities,
      createEntities,
      updateEntities,
      deleteEntities,
      mutateEntity,
    }), [
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

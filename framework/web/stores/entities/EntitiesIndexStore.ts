import type { PrimitiveAtom } from 'jotai';
import { useAtomCallback } from 'jotai/utils';

import emptyArrAtom from 'atoms/emptyArrAtom';
import { getEntitiesState, EntitiesMap } from './EntitiesStore';

type ColVal = string | number | null;

type EntitiesIndexLeaf<T extends EntityType> = {
  entitiesAtom: PrimitiveAtom<Entity<T>[]>,
};

type EntitiesIndex<T extends EntityType> = Map<
  ColVal,
  EntitiesIndex<T> | EntitiesIndexLeaf<T>
>;

const EntitiesIndexState = new Map<
  EntityType,
  Map<string, EntitiesIndex<any>>
>();

function getEntitiesIndexLeaf<T extends EntityType>(
  index: EntitiesIndex<T>,
  cols: string[],
  vals: ObjectOf<ColVal>,
): EntitiesIndexLeaf<T> | null {
  let obj = index;
  for (let i = 0; i < cols.length; i++) {
    const col = cols[i];
    const val = vals[col] as ColVal;
    if (val === undefined) {
      return null;
    }

    if (i === cols.length - 1) {
      if (!obj.has(val)) {
        obj.set(val, {
          entitiesAtom: atom([]) as unknown as PrimitiveAtom<Entity<T>[]>,
        });
      }

      return obj.get(val) as EntitiesIndexLeaf<T>;
    }

    obj = TS.mapValOrSetDefault(obj, val, new Map());
  }

  throw new Error('getEntitiesIndexLeaf: empty cols');
}

export const [
  EntitiesIndexProvider,
  useEntitiesIndexStore,
] = constate(
  function EntitiesIndexStore() {
    const { addEntityListener } = useEntitiesStore();

    const addAtomEntity = markStable(useAtomCallback(useCallback(
      (
        get,
        set,
        entitiesAtom: PrimitiveAtom<Entity[]>,
        newEntity: Entity,
      ) => {
        const oldEntities = get(entitiesAtom);
        const idx = oldEntities.findIndex(e => e.id === newEntity.id);
        const newEntities = idx >= 0
          ? [
            ...oldEntities.slice(0, idx),
            newEntity,
            ...oldEntities.slice(idx + 1),
          ]
          : [...oldEntities, newEntity];

        set(entitiesAtom, newEntities);
      },
      [],
    )));

    const removeAtomEntity = markStable(useAtomCallback(useCallback(
      (
        get,
        set,
        entitiesAtom: PrimitiveAtom<Entity[]>,
        oldEntity: Entity,
      ) => {
        const oldEntities = get(entitiesAtom);
        const filtered = oldEntities.filter(e => e.id !== oldEntity.id);
        if (filtered.length !== oldEntities.length) {
          set(entitiesAtom, filtered);
        }
      },
      [],
    )));

    const addIndex = useCallback(<T extends EntityType>(
      type: T,
      cols: string[],
    ) => {
      const indexesMap = TS.defined(EntitiesIndexState.get(type));
      const entities = getEntitiesState().get(type) as EntitiesMap<Entity<T>> | undefined;
      const index: EntitiesIndex<T> = new Map();
      if (entities) {
        const leafToEntities = new Map<EntitiesIndexLeaf<T>, Entity<T>[]>();
        for (const ent of entities.values()) {
          const leaf = getEntitiesIndexLeaf(index, cols, ent as unknown as ObjectOf<ColVal>);
          if (leaf) {
            const leafEntities = TS.mapValOrSetDefault(leafToEntities, leaf, []);
            leafToEntities.set(leaf, [...leafEntities, ent]);
          } else if (!process.env.PRODUCTION) {
            ErrorLogger.warn(new Error('addIndex: missing cols'), { cols, ent });
          }
        }
        for (const [leaf, ents] of leafToEntities) {
          leaf.entitiesAtom = atom(ents);
        }
      }

      indexesMap.set(cols.join(','), index);

      const handleDelete = (oldEnt: Entity<T>) => {
        const leaf = getEntitiesIndexLeaf(index, cols, oldEnt as unknown as ObjectOf<ColVal>);
        if (leaf) {
          removeAtomEntity(leaf.entitiesAtom as unknown as PrimitiveAtom<Entity[]>, oldEnt);
        }
      };

      const handleUpdate = (ent: Entity<T>, oldEnt?: Entity<T> | null) => {
        const leaf = getEntitiesIndexLeaf(index, cols, ent as unknown as ObjectOf<ColVal>);
        if (oldEnt) {
          const oldLeaf = getEntitiesIndexLeaf(index, cols, oldEnt as unknown as ObjectOf<ColVal>);
          if (oldLeaf) {
            removeAtomEntity(oldLeaf.entitiesAtom as unknown as PrimitiveAtom<Entity[]>, oldEnt);
          }
        }

        if (leaf) {
          addAtomEntity(leaf.entitiesAtom as unknown as PrimitiveAtom<Entity[]>, ent);
        }
      };

      addEntityListener('load', type, handleUpdate);
      addEntityListener('create', type, handleUpdate);
      addEntityListener('update', type, handleUpdate);
      addEntityListener('delete', type, handleDelete);
    }, [addAtomEntity, removeAtomEntity, addEntityListener]);

    // Note: index reference stays the same even if contents change
    const getIndex = useCallback(<T extends EntityType>(
      type: T,
      cols: string[],
    ): EntitiesIndex<T> => {
      const indexesMap = TS.mapValOrSetDefault(EntitiesIndexState, type, new Map());
      cols.sort();
      const colsKey = cols.join(',');
      if (!indexesMap.has(colsKey)) {
        addIndex(type, cols);
      }

      return TS.defined(indexesMap.get(colsKey));
    }, [addIndex]);

    const getEntitiesAtom = useCallback(<T extends EntityType>(
      type: T,
      vals: ObjectOf<ColVal>,
    ): PrimitiveAtom<Entity<T>[]> => {
      const cols = TS.objKeys(vals).sort();
      const index = getIndex(type, cols);
      const leaf = getEntitiesIndexLeaf(index, cols, vals);

      return leaf
        ? leaf.entitiesAtom
        : (emptyArrAtom as unknown as PrimitiveAtom<Entity<T>[]>);
    }, [getIndex]);

    const getEntities = markStable(useAtomCallback(useCallback(
      (
        get,
        _,
        type: EntityType,
        vals: ObjectOf<any>,
      ) => get(getEntitiesAtom(type, vals)),
      [getEntitiesAtom],
    )));

    return useMemo(() => ({
      getIndex,
      getEntitiesAtom,
      getEntities,
    }), [
      getIndex,
      getEntitiesAtom,
      getEntities,
    ]);
  },
);

import { atomFamily, useAtomCallback } from 'jotai/utils';

export const relationConfigsFamily = atomFamily(
  (_: string) => atom<Stable<ApiRelationConfig> | null>(null),
);

export const [
  RelationsProvider,
  useRelationsStore,
] = constate(
  function RelationsStore() {
    const setRelationConfig = markStable(useAtomCallback(useCallback(
      (
        get,
        set,
        entityType: EntityType,
        relationName: string,
        newConfig: ApiRelationConfig,
      ) => {
        const relationConfigAtom = relationConfigsFamily(`${entityType},${relationName}`);
        if (!get(relationConfigAtom)) {
          set(relationConfigAtom, markStable(newConfig));
        }
      },
      [],
    )));

    const addRelationConfigs = useCallback((configs: ApiRelationConfigs) => {
      for (const [entityType, relationConfigs] of TS.objEntries(configs)) {
        for (const [relationName, config] of TS.objEntries(relationConfigs)) {
          setRelationConfig(entityType, relationName, config);
        }
      }
    }, [setRelationConfig]);

    return useMemo(() => ({
      addRelationConfigs,
    }), [
      addRelationConfigs,
    ]);
  },
);

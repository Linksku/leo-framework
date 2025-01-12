import { getDefaultStore } from 'jotai';
import { atomFamily } from 'jotai/utils';

export const relationConfigsFamily = atomFamily(
  (_: string) => atom<Stable<ApiRelationConfig> | null>(null),
);

export const addRelationConfigs = markStable(function addRelationConfigs(
  configs: ApiRelationConfigs,
) {
  const store = getDefaultStore();

  for (const [entityType, relationConfigs] of TS.objEntries(configs)) {
    for (const [relationName, config] of TS.objEntries(relationConfigs)) {
      const relationConfigAtom = relationConfigsFamily(`${entityType},${relationName}`);
      if (!store.get(relationConfigAtom)) {
        store.set(relationConfigAtom, markStable(config));
      }
    }
  }
});

export function useRelationConfig(entityType: EntityType, relationName: string) {
  return useAtomValue(relationConfigsFamily(`${entityType},${relationName}`));
}

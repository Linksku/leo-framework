import RelationConfigsEventEmitter from 'services/RelationConfigsEventEmitter';

export const [
  RelationsProvider,
  useRelationsStore,
] = constate(
  function RelationsStore() {
    const relationConfigsRef = useRef(new Map<EntityType, Map<string, ApiRelationConfig>>());

    const addRelationConfigs = useCallback((configs: ApiRelationConfigs) => {
      const changedKeys: string[] = [];
      const newAllModelConfigs = new Map(relationConfigsRef.current);
      for (const [entityType, relationConfigs] of TS.objEntries(configs)) {
        let modelConfigs = TS.mapValOrSetDefault(
          newAllModelConfigs,
          entityType,
          new Map(),
        );
        for (const [relationName, config] of TS.objEntries(relationConfigs)) {
          if (!modelConfigs.has(relationName)) {
            if (modelConfigs === relationConfigsRef.current.get(entityType)) {
              modelConfigs = new Map(modelConfigs);
              newAllModelConfigs.set(entityType, modelConfigs);
            }

            modelConfigs.set(relationName, config);
            changedKeys.push(`${config.fromModel},${relationName}`);
          }
        }
      }

      if (changedKeys.length) {
        relationConfigsRef.current = newAllModelConfigs;
        for (const key of changedKeys) {
          RelationConfigsEventEmitter.emit(key);
        }

        if (!process.env.PRODUCTION && typeof window !== 'undefined') {
          // @ts-ignore for debugging
          window.relationConfigs = relationConfigsRef.current;
        }
      }
    }, []);

    return useMemo(() => ({
      relationConfigsRef,
      addRelationConfigs,
    }), [
      relationConfigsRef,
      addRelationConfigs,
    ]);
  },
);

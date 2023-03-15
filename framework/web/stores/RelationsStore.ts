import RelationConfigsEventEmitter from 'services/RelationConfigsEventEmitter';
import deepFreezeIfDev from 'utils/deepFreezeIfDev';

export const [
  RelationsProvider,
  useRelationsStore,
] = constate(
  function RelationsStore() {
    const relationConfigsRef = useRef(deepFreezeIfDev(
      Object.create(null) as ApiRelationConfigs,
    ));

    const addRelationConfigs = useCallback((configs: ApiRelationConfigs) => {
      const changedKeys: string[] = [];
      const newAllModelConfigs = Object.assign(
        Object.create(null) as ApiRelationConfigs,
        relationConfigsRef.current,
      );
      for (const [entityType, relationConfigs] of TS.objEntries(configs)) {
        let modelConfigs = TS.objValOrSetDefault(
          newAllModelConfigs,
          entityType,
          Object.create(null) as Defined<ValueOf<ApiRelationConfigs>>,
        );
        for (const [relationName, config] of TS.objEntries(relationConfigs)) {
          if (!modelConfigs[relationName]) {
            if (modelConfigs === relationConfigsRef.current[entityType]) {
              modelConfigs = Object.assign(
                Object.create(null),
                modelConfigs,
              );
              newAllModelConfigs[entityType] = modelConfigs;
            }

            modelConfigs[relationName] = config;
            changedKeys.push(`${config.fromModel},${relationName}`);
          }
        }
      }

      if (changedKeys.length) {
        relationConfigsRef.current = deepFreezeIfDev(newAllModelConfigs);
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
  function RelationsStore(val) {
    return val;
  },
);

import throttledPromiseAll from 'utils/throttledPromiseAll';
import MaterializedViewModels from 'services/model/allMaterializedViewModels';
import { MZ_SINK_PREFIX } from 'consts/mz';
import { RECREATE_MZ_SINKS_LOCK_NAME, RECREATE_MZ_SINKS_REDIS_KEY } from 'consts/infra';
import knexMZ from 'services/knex/knexMZ';
import initInfraWrap from 'utils/infra/initInfraWrap';
import createMZSink from 'scripts/mv/helpers/createMZSink';

export default async function recreateMZSinks(_sinkModels?: ModelClass[]) {
  const sinkModels = _sinkModels
    ?? MaterializedViewModels
      .filter(m => m.getReplicaTable());
  return initInfraWrap(async () => {
    await throttledPromiseAll(3, sinkModels, async Model => {
      await knexMZ.raw('DROP SINK IF EXISTS ??', [MZ_SINK_PREFIX + Model.type]);
      await createMZSink({
        modelType: Model.type,
        primaryKey: Array.isArray(Model.primaryIndex)
          ? Model.primaryIndex
          : [Model.primaryIndex],
      });
    });
  }, {
    lockName: RECREATE_MZ_SINKS_LOCK_NAME,
    redisKey: RECREATE_MZ_SINKS_REDIS_KEY,
    setInitInfra: sinkModels.length > 1,
  });
}

import MaterializedViewModels from 'services/model/allMaterializedViewModels';
import knexMZ from 'services/knex/knexMZ';
import { MZ_SINK_PREFIX } from 'consts/mz';
import { redisMaster } from 'services/redis';
import { RECREATE_MZ_SINKS_REDIS_KEY } from 'consts/infra';
import { addHealthcheck } from './HealthcheckManager';

// Note: when PG restarts, there was sometimes an error.
// --introspection-frequency off might've fixed this
// E.g. ERROR mz_dataflow::compute::render::reduce: [customer-data] Non-positive accumulation in MinsMaxesHierarchical: key: (Row{[String("u183")]}, 26896)        value: [Row{[Int64(1673675639999)]}]
// ERROR mz_dataflow::compute::render::reduce: [customer-data] Negative accumulation in ReduceMinsMaxes: [Row{[Int64(1674116761699)]}] with count -1
addHealthcheck('mzSinks', {
  cb: async function mzSinksHealthcheck() {
    if (await redisMaster.exists(RECREATE_MZ_SINKS_REDIS_KEY)) {
      return;
    }

    const sinks = await knexMZ<{ name: string }>('mz_sinks')
      .select('name')
      .where('name', 'like', `${MZ_SINK_PREFIX}%`);
    if (sinks.length === 0) {
      throw new Error('mzSinksHealthcheck: no sinks');
    }

    const modelsWithSinks = new Set(
      MaterializedViewModels
        .filter(model => model.getReplicaTable())
        .map(model => model.type),
    );
    const existingSinkModels = new Set(sinks.map(
      sink => sink.name.slice(MZ_SINK_PREFIX.length) as ModelType,
    ));
    if (existingSinkModels.size < modelsWithSinks.size) {
      const missingSinks = [...modelsWithSinks].filter(model => !existingSinkModels.has(model));
      throw getErr('mzSinksHealthcheck: missing sinks', { missingSinks });
    }
    if (existingSinkModels.size > modelsWithSinks.size) {
      const extraSinks = [...existingSinkModels].filter(model => !modelsWithSinks.has(model));
      throw getErr('mzSinksHealthcheck: extra sinks', { extraSinks: extraSinks.slice(0, 10) });
    }
  },
  resourceUsage: 'mid',
  usesResource: 'mz',
  stability: 'mid',
  timeout: 2 * 60 * 1000,
});

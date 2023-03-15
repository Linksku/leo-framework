import pLimit from 'p-limit';

import { MZ_SINK_PREFIX, MZ_SINK_KAFKA_ERRORS_TABLE } from 'consts/mz';
import { RECREATE_MZ_SINKS_LOCK_NAME, RECREATE_MZ_SINKS_REDIS_KEY } from 'consts/infra';
import knexMZ from 'services/knex/knexMZ';
import initInfraWrap from 'utils/infra/initInfraWrap';
import createMZSink from 'scripts/mv/helpers/createMZSink';
import fetchMZPrometheusFailingSinkIds from './fetchMZPrometheusFailingSinkIds';

const limiter = pLimit(3);

export default async function recreateFailingPrometheusMZSinks(
  _failing?: Awaited<ReturnType<typeof fetchMZPrometheusFailingSinkIds>>,
) {
  const failing = _failing ?? await fetchMZPrometheusFailingSinkIds();
  if (!failing.length) {
    return null;
  }

  const existingErrors = await knexMZ.select(['modelType', 'sinkId'])
    .from(MZ_SINK_KAFKA_ERRORS_TABLE);
  const existingErrorsSet = new Set(existingErrors.map(row => `${row.modelType},${row.sinkId}`));

  return initInfraWrap(async () => {
    await Promise.all(failing.map(f => limiter(async () => {
      await knexMZ.raw('DROP SINK IF EXISTS ??', [`${MZ_SINK_PREFIX}${f.modelType}`]);
      const Model = getModelClass(f.modelType as ModelType);
      await createMZSink({
        name: Model.type,
        primaryKey: Array.isArray(Model.primaryIndex)
          ? Model.primaryIndex
          : [Model.primaryIndex],
      });

      // Note: MZ doesn't have unique constraints, locks, etc.
      if (existingErrorsSet.has(`${f.modelType},${f.sinkId}`)) {
        // Note: MZ doesn't support upsert or prepared statements here
        await knexMZ.raw(`
          UPDATE ${MZ_SINK_KAFKA_ERRORS_TABLE} t
          SET count = GREATEST(t.count, ${f.numErrors})
          WHERE "modelType" = '${f.modelType}'
            AND "sinkId" = '${f.sinkId}'
        `);
      } else {
        await knexMZ.raw(`
          INSERT INTO ${MZ_SINK_KAFKA_ERRORS_TABLE} ("modelType", "sinkId", count)
          VALUES (?, ?, ?)
        `, [f.modelType, f.sinkId, f.numErrors]);
        existingErrorsSet.add(`${f.modelType},${f.sinkId}`);
      }
    })));
  }, {
    lockName: RECREATE_MZ_SINKS_LOCK_NAME,
    redisKey: RECREATE_MZ_SINKS_REDIS_KEY,
    setInitInfra: failing.length > 1,
  });
}

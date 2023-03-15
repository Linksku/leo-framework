import type { Arguments } from 'yargs';

import { MZ_SINK_CONNECTOR_PREFIX, MZ_SINK_PREFIX, MZ_SINK_TOPIC_PREFIX } from 'consts/mz';
import redisFlushAll from 'utils/infra/redisFlushAll';
import { MODEL_NAMESPACES } from 'consts/coreRedisNamespaces';
import waitForKafkaConnectReady from 'utils/infra/waitForKafkaConnectReady';
import deleteKafkaConnector from 'utils/infra/deleteKafkaConnector';
import fetchKafkaConnectors from 'utils/infra/fetchKafkaConnectors';
import deleteKafkaTopics from 'utils/infra/deleteKafkaTopics';
import knexMZ from 'services/knex/knexMZ';
import initInfraWrap from 'utils/infra/initInfraWrap';
import deleteSchemaRegistry from 'utils/infra/deleteSchemaRegistry';
import isModelType from 'utils/models/isModelType';
import initMZ from './mv/initMZ';

export default async function recreateOneMV(args?: Arguments) {
  const modelType = args?._[2] as ModelType | undefined;
  if (!modelType || !isModelType(modelType)) {
    throw new Error('recreateOneMV: modelType required');
  }

  return initInfraWrap(async () => {
    await waitForKafkaConnectReady();

    // todo: low/mid destroy sinks/etc for all dependent MVs
    const connectors = await fetchKafkaConnectors(`${MZ_SINK_CONNECTOR_PREFIX}${modelType}_`);
    for (const connector of connectors) {
      await deleteKafkaConnector(connector);
    }
    await knexMZ.raw('DROP SINK IF EXISTS ??', [`${MZ_SINK_PREFIX}${modelType}`]);
    await deleteKafkaTopics(new RegExp(`^${MZ_SINK_TOPIC_PREFIX}${modelType}($|-consistency$)`));
    await deleteSchemaRegistry(new RegExp(`^${MZ_SINK_TOPIC_PREFIX}${modelType}-(key|value)$`));
    await knexMZ.raw('DROP VIEW IF EXISTS ?? CASCADE', [modelType]);
    printDebug(`Destroyed ${modelType} MV`, 'success');

    await redisFlushAll(MODEL_NAMESPACES);

    await initMZ();
  });
}

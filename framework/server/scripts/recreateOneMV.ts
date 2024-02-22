import type { Arguments } from 'yargs';

import {
  MZ_SINK_CONNECTOR_PREFIX,
  MZ_SINK_PREFIX,
  MZ_SINK_TOPIC_PREFIX,
} from 'consts/mz';
import redisFlushAll from 'utils/infra/redisFlushAll';
import { MODEL_NAMESPACES } from 'consts/coreRedisNamespaces';
import waitForKafkaConnectReady from 'utils/infra/waitForKafkaConnectReady';
import deleteKafkaConnector from 'utils/infra/deleteKafkaConnector';
import fetchKafkaConnectors from 'utils/infra/fetchKafkaConnectors';
import deleteKafkaTopics from 'utils/infra/deleteKafkaTopics';
import knexMZ from 'services/knex/knexMZ';
import knexRR from 'services/knex/knexRR';
import initInfraWrap from 'utils/infra/initInfraWrap';
import deleteSchemaRegistry from 'utils/infra/deleteSchemaRegistry';
import isModelType from 'utils/models/isModelType';
import MaterializedView from 'services/model/MaterializedView';
import initMZ from './mv/initMZ';

export default async function recreateOneMV(args?: Arguments) {
  let arg = args?._[2];
  if (!arg || typeof arg !== 'string') {
    throw new Error('recreateOneMV: modelType required');
  }

  arg = arg[0].toLowerCase() + arg.slice(1);
  if (!isModelType(arg)) {
    throw new Error('recreateOneMV: modelType required');
  }
  const modelType = arg;
  const Model = getModelClass(modelType);
  if (!Model.isMV) {
    throw new Error('recreateOneMV: model isn\'t MV');
  }

  return initInfraWrap(async () => {
    await waitForKafkaConnectReady();

    // todo: mid/mid destroy views/sinks/etc for all dependent MVs
    const connectors = await fetchKafkaConnectors(`${MZ_SINK_CONNECTOR_PREFIX}${modelType}_`);
    for (const connector of connectors) {
      await deleteKafkaConnector(connector);
    }
    await knexMZ.raw('DROP SINK IF EXISTS ??', [MZ_SINK_PREFIX + modelType]);
    await deleteKafkaTopics(new RegExp(`^${MZ_SINK_TOPIC_PREFIX}${modelType}($|-)`));
    await deleteSchemaRegistry(new RegExp(`^${MZ_SINK_TOPIC_PREFIX}${modelType}-(key|value)$`));
    await knexMZ.raw('DROP VIEW IF EXISTS ?? CASCADE', [modelType]);
    printDebug(`Destroyed ${modelType} MV`, 'success');

    if (TS.extends(Model, MaterializedView) && Model.getReplicaTable()) {
      await knexRR.raw(
        'TRUNCATE ??',
        [modelType],
      );
      printDebug(`Destroyed ${modelType} RR`, 'success');
    }

    await redisFlushAll(MODEL_NAMESPACES);

    await initMZ();
  });
}

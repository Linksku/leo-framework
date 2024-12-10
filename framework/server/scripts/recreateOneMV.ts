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
import MaterializedView from 'core/models/MaterializedView';
import throttledPromiseAll from 'utils/throttledPromiseAll';
import retry from 'utils/retry';
import getModelDependents from 'utils/models/getModelDependents';
import initMZ from './mv/initMZ';
import pgdump from './db/pgdump';

export default async function recreateOneMV(args?: Arguments<{ waitForComplete: boolean }>) {
  let arg = args?._[2];
  if (!arg || typeof arg !== 'string') {
    throw new Error('recreateOneMV: modelType required');
  }

  arg = arg[0].toLowerCase() + arg.slice(1);
  if (!isModelType(arg)) {
    throw new Error('recreateOneMV: modelType required');
  }
  const modelType = arg;
  const MVModel = getModelClass(modelType);
  if (!MVModel.isMV) {
    throw new Error('recreateOneMV: model isn\'t MV');
  }
  const modelsToDelete = [MVModel, ...getModelDependents(MVModel)];

  return initInfraWrap(async () => {
    await waitForKafkaConnectReady();

    const allConnectors = await fetchKafkaConnectors(MZ_SINK_CONNECTOR_PREFIX);
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    await throttledPromiseAll(5, modelsToDelete, Model => retry(
      async () => {
        if (Model.getReplicaTable()) {
          const connector = allConnectors.find(
            c => c.startsWith(`${MZ_SINK_CONNECTOR_PREFIX}${Model.type}_`),
          );
          if (connector) {
            await deleteKafkaConnector(connector);
          }

          await knexMZ.raw('DROP SINK IF EXISTS ??', [MZ_SINK_PREFIX + Model.type]);
          await deleteKafkaTopics(new RegExp(`^${MZ_SINK_TOPIC_PREFIX}${Model.type}($|-)`));
          await deleteSchemaRegistry(
            new RegExp(`^${MZ_SINK_TOPIC_PREFIX}${Model.type}-(key|value)$`),
          );
        }

        await knexMZ.raw('DROP VIEW IF EXISTS ?? CASCADE', [Model.type]);
        printDebug(`Destroyed ${Model.type} MV`, 'success');
      },
      {
        timeout: 60 * 1000,
        interval: 1000,
        ctx: `recreateOneMV(${MVModel.type})`,
      },
    ));

    if (TS.extends(MVModel, MaterializedView) && MVModel.getReplicaTable()) {
      await knexRR.raw(
        'TRUNCATE ??',
        [MVModel.type],
      );
      printDebug(`Destroyed ${MVModel.type} RR`, 'success');
    }

    await redisFlushAll(MODEL_NAMESPACES);

    await initMZ({ waitForComplete: args?.waitForComplete });

    await pgdump({ dumpBT: false });
  });
}

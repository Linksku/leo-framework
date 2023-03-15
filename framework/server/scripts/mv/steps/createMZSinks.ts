import pLimit from 'p-limit';

import { MZ_SINK_CONNECTOR_PREFIX, MZ_SINK_PREFIX } from 'consts/mz';
import knexRR from 'services/knex/knexRR';
import MaterializedViewModels from 'services/model/allMaterializedViewModels';
import showMzSystemRows from 'utils/db/showMzSystemRows';
import fetchKafkaConnectors from 'utils/infra/fetchKafkaConnectors';
import { getDateProps } from 'utils/models/dateSchemaHelpers';
import createMZSink from '../helpers/createMZSink';
import createMZSinkConnector from '../helpers/createMZSinkConnector';
import verifyCreatedTables from '../helpers/verifyCreatedTables';

const limiter = pLimit(5);

export default async function createMZSinks() {
  const startTime = performance.now();

  const modelsWithSink = MaterializedViewModels.filter(model => model.getReplicaTable());
  const existingSinks = new Set(await showMzSystemRows('SHOW SINKS'));
  const existingSinksModels = new Set(
    modelsWithSink
      .filter(model => existingSinks.has(`${MZ_SINK_PREFIX}${model.tableName}`))
      .map(model => model.type),
  );

  const existingConnectors = await fetchKafkaConnectors(MZ_SINK_CONNECTOR_PREFIX);
  const existingConnectorModels = new Set(
    modelsWithSink
      .filter(model => existingConnectors.some(c => c.startsWith(`${MZ_SINK_CONNECTOR_PREFIX}${model.type}_`)))
      .map(model => model.type),
  );
  if (existingSinksModels.size === modelsWithSink.length
    && existingConnectorModels.size === modelsWithSink.length) {
    printDebug('All Materialize sinks already created', 'info');
    return;
  }
  printDebug('Creating Materialize sinks', 'info');

  const createdSinks = new Set<ModelType>();
  await Promise.all(
    modelsWithSink.map(model => limiter(async () => {
      if (!existingSinksModels.has(model.type)) {
        await createMZSink({
          name: model.type,
          primaryKey: Array.isArray(model.primaryIndex) ? model.primaryIndex : [model.primaryIndex],
        });
        createdSinks.add(model.type);
      }

      if (!existingConnectorModels.has(model.type)) {
        await createMZSinkConnector({
          name: model.type,
          replicaTable: TS.notNull(model.getReplicaTable()),
          primaryKey: model.primaryIndex,
          timestampProps: [...getDateProps(model.getSchema())],
        });
        createdSinks.add(model.type);
      }
    })),
  );

  await verifyCreatedTables(
    'rr',
    knexRR,
    modelsWithSink.filter(model => createdSinks.has(model.type)),
  );

  printDebug(`Created Materialize sinks after ${Math.round((performance.now() - startTime) / 100) / 10}s`, 'success');
}

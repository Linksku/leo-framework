import throttledPromiseAll from 'utils/throttledPromiseAll';
import { MZ_SINK_CONNECTOR_PREFIX, MZ_SINK_PREFIX } from 'consts/mz';
import { PG_BT_POOL_MAX, PG_RR_POOL_MAX } from 'consts/infra';
import knexRR from 'services/knex/knexRR';
import MaterializedViewModels from 'core/models/allMaterializedViewModels';
import showMzSystemRows from 'utils/db/showMzSystemRows';
import fetchKafkaConnectors from 'utils/infra/fetchKafkaConnectors';
import { getDateProps } from 'utils/models/dateSchemaHelpers';
import createMZSink from '../helpers/createMZSink';
import createMZSinkConnector from '../helpers/createMZSinkConnector';
import verifyCreatedTables from '../helpers/verifyCreatedTables';

export default async function createMZSinks() {
  const startTime = performance.now();

  printDebug('Checking existing MZ sinks', 'info');
  const modelsWithSink = MaterializedViewModels.filter(model => model.getReplicaTable());
  // Can get error, possibly from OOM:
  // librdkafka: GETPID [thrd:main]: Failed to acquire transactional PID from broker TxnCoordinator/1:
  // Broker: Producer attempted to update a transaction while another concurrent operation on the same transaction was ongoing: retrying
  let existingSinksModels: Set<ModelType> = new Set();
  let existingConnectorModels: Set<ModelType> = new Set();
  try {
    const existingSinks = new Set(await showMzSystemRows('SHOW SINKS', 30 * 1000));
    existingSinksModels = new Set(
      modelsWithSink
        .filter(model => existingSinks.has(MZ_SINK_PREFIX + model.tableName))
        .map(model => model.type),
    );
    const existingConnectors = await fetchKafkaConnectors(MZ_SINK_CONNECTOR_PREFIX);
    existingConnectorModels = new Set(
      TS.filterNulls(existingConnectors
        .map(c => modelsWithSink.find(
          model => c.startsWith(`${MZ_SINK_CONNECTOR_PREFIX}${model.type}_`),
        )?.type)),
    );
    if (existingSinksModels.size === modelsWithSink.length
      && existingConnectorModels.size === modelsWithSink.length) {
      printDebug('All Materialize sinks already created', 'info');
      return;
    }
    if (existingConnectors.length > existingConnectorModels.size) {
      const extraConnectors = existingConnectors.filter(
        c => !modelsWithSink.some(model => c.startsWith(`${MZ_SINK_CONNECTOR_PREFIX}${model.type}_`)),
      );
      printDebug(`createMZSinks: extra connectors: ${extraConnectors.join(', ')}`, 'warn');
    }
  } catch {}

  // Check max connections
  const maxConnectionsRows = await rawSelect(
    'rr',
    'SHOW max_connections',
  );
  const maxConnections = TS.parseIntOrNull(maxConnectionsRows?.rows?.[0]?.max_connections);
  const requiredConnections = modelsWithSink.length
    + PG_BT_POOL_MAX
    + PG_RR_POOL_MAX
    // Arbitrary buffer
    + 10;
  if (maxConnections && requiredConnections > maxConnections) {
    printDebug(`createMZSinks: max_connections too low ${maxConnections} < ${requiredConnections}`);
  }

  printDebug('Creating Materialize sinks', 'info');
  const createdSinks = new Set<ModelType>();
  await throttledPromiseAll(5, modelsWithSink, async model => {
    if (!existingSinksModels.has(model.type)) {
      await createMZSink({
        modelType: model.type,
        primaryKey: Array.isArray(model.primaryIndex) ? model.primaryIndex : [model.primaryIndex],
      });
      createdSinks.add(model.type);
    }

    // Note: with pg cdc, might need to delete old connector
    if (!existingConnectorModels.has(model.type)) {
      await createMZSinkConnector({
        name: model.type,
        replicaTable: TS.notNull(model.getReplicaTable()),
        primaryKey: model.primaryIndex,
        timestampProps: [...getDateProps(model.getSchema() as unknown as JsonSchemaProperties)],
      });
      createdSinks.add(model.type);
    }
  });

  printDebug(
    `Created Materialize sinks after ${Math.round((performance.now() - startTime) / 100) / 10}s`,
    'success',
  );

  await verifyCreatedTables(
    'rr',
    knexRR,
    modelsWithSink.filter(model => createdSinks.has(model.type)),
  );
}

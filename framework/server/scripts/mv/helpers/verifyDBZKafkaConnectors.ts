import type { ConnectorInfo, ConnectorStatus } from 'utils/infra/fetchKafkaConnectors';
import fetchKafkaConnectors from 'utils/infra/fetchKafkaConnectors';
import {
  DBZ_CONNECTOR_UPDATEABLE,
  DBZ_CONNECTOR_INSERT_ONLY,
} from 'consts/mz';
import { PG_BT_SCHEMA } from 'consts/infra';
import EntityModels from 'core/models/allEntityModels';

async function _verifyConnector(
  connectorName: string,
  models: ModelClass[],
): Promise<{
  isValid: boolean,
  reason?: string,
  connector: (ConnectorInfo & ConnectorStatus) | null,
}> {
  const { connectorsInfo, connectorsStatus } = await promiseObj({
    connectorsInfo: fetchKafkaConnectors(connectorName, 'info'),
    connectorsStatus: fetchKafkaConnectors(connectorName, 'status'),
  });
  if (!connectorsInfo.length || !connectorsStatus.length) {
    return {
      isValid: false,
      reason: 'missing',
      connector: null,
    };
  }
  if (connectorsInfo.length > 1 || connectorsStatus.length > 1) {
    return {
      isValid: false,
      reason: 'extra connectors',
      connector: null,
    };
  }

  const connector = { ...connectorsInfo[0], ...connectorsStatus[0] };
  if (connector.status.connector.state !== 'RUNNING') {
    return {
      isValid: false,
      reason: 'not running',
      connector,
    };
  }
  const failedTask = connector.status.tasks.find(t => t.state === 'FAILED');
  if (failedTask) {
    const traceLines = failedTask.trace.split('\n');
    return {
      isValid: false,
      reason: `failed task:\n${[
        traceLines[0],
        ...traceLines.slice(1).filter(line => line.startsWith('Caused by:')),
      ].join('\n')}`,
      connector,
    };
  }

  const includedTables = connector.info.config['table.include.list']?.split(',') ?? [];
  const invalidIncludedTables = includedTables.filter(
    table => !table.startsWith(`^${PG_BT_SCHEMA}.`) || !table.endsWith('$'),
  );
  if (invalidIncludedTables.length) {
    return {
      isValid: false,
      reason: `invalid table.include.list: ${invalidIncludedTables.join(', ')}`,
      connector,
    };
  }
  const includedModelTypes = new Set(
    includedTables
      .map(m => m.slice(`^${PG_BT_SCHEMA}.`.length, -1)),
  );
  return {
    isValid: includedModelTypes.size === models.length
      && models.every(m => includedModelTypes.has(m.type)),
    reason: `missing models: ${models.filter(m => !includedModelTypes.has(m.type)).map(m => m.type).join(', ')}`,
    connector,
  };
}

export function verifyUpdateableConnector() {
  const updateableModels = EntityModels.filter(m => !m.useInsertOnlyPublication);
  return _verifyConnector(DBZ_CONNECTOR_UPDATEABLE, updateableModels);
}

export function verifyInsertOnlyConnector() {
  const insertOnlyModels = EntityModels.filter(m => m.useInsertOnlyPublication);
  return _verifyConnector(DBZ_CONNECTOR_INSERT_ONLY, insertOnlyModels);
}

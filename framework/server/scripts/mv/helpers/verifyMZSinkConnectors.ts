import get from 'lodash/get.js';

import { MZ_SINK_CONNECTOR_PREFIX } from 'consts/mz';
import MaterializedViewModels from 'services/model/allMaterializedViewModels';
import fetchKafkaConnectors from 'utils/infra/fetchKafkaConnectors';

export default async function verifyMZSinkConnectors() {
  const connectors = await fetchKafkaConnectors(MZ_SINK_CONNECTOR_PREFIX, 'status');
  if (connectors.length === 0) {
    throw new Error('verifyMZSinkConnectors: no connectors');
  }

  const modelsWithSink = MaterializedViewModels
    .filter(model => model.getReplicaTable());
  const missingModels = modelsWithSink
    .filter(model => !connectors.some(
      c => c.name.startsWith(`${MZ_SINK_CONNECTOR_PREFIX}${model.type}_`),
    ));
  if (missingModels.length) {
    throw getErr('verifyMZSinkConnectors: missing connectors', {
      numMissing: missingModels.length,
      missingConnectors: missingModels.map(m => m.type),
    });
  }
  if (connectors.length !== modelsWithSink.length) {
    throw new Error('verifyMZSinkConnectors: wrong number of connectors');
  }

  const notRunning = connectors.filter(c => get(c, 'status.connector.state') !== 'RUNNING');
  if (notRunning.length) {
    throw getErr('verifyMZSinkConnectors: connector(s) not running', {
      connectors: notRunning.map(c => `${c.name}: ${get(c, 'status.connector.state')}`),
    });
  }

  const failedTasks = connectors
    .filter(c => get(c, 'status.tasks')?.find(t => t.state === 'FAILED'));
  if (failedTasks.length) {
    const traces: string[] = [];
    for (const c of failedTasks) {
      const trace = get(c, 'status.tasks')?.find(t => t.state === 'FAILED')
        ?.trace.split('\n');
      const reason = trace?.filter(line => line.startsWith('Caused by:')) ?? trace?.[0];
      traces.push(`${c.name}: ${reason}`);
    }
    throw getErr('verifyMZSinkConnectors: failed tasks', {
      connectors: traces,
    });
  }
}

import get from 'lodash/get.js';

import { MZ_SINK_CONNECTOR_PREFIX } from 'consts/mz';
import MaterializedViewModels from 'core/models/allMaterializedViewModels';
import fetchKafkaConnectors from 'utils/infra/fetchKafkaConnectors';
import throttledPromiseAll from 'utils/throttledPromiseAll';
import fetchJson from 'utils/fetchJson';
import { KAFKA_CONNECT_HOST, KAFKA_CONNECT_PORT } from 'consts/mz';

export default async function verifyMZSinkConnectors(minFailPercent = 0) {
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
  let warning: Error | undefined;
  if (missingModels.length) {
    const err = getErr('verifyMZSinkConnectors: missing connectors', {
      numMissing: missingModels.length,
      missingConnectors: missingModels.map(m => m.type),
    });
    if (missingModels.length > modelsWithSink.length * minFailPercent) {
      throw err;
    }
    warning = err;
  }
  if (connectors.length !== modelsWithSink.length) {
    const err = new Error('verifyMZSinkConnectors: wrong number of connectors');
    if (connectors.length > modelsWithSink.length
      || connectors.length < modelsWithSink.length * (1 - minFailPercent)) {
      throw err;
    }
    warning ??= err;
  }

  const notRunning = connectors.filter(c => get(c, 'status.connector.state') !== 'RUNNING');
  if (notRunning.length) {
    const err = getErr('verifyMZSinkConnectors: connector(s) not running', {
      connectors: notRunning.map(c => `${c.name}: ${get(c, 'status.connector.state')}`),
    });
    if (notRunning.length > modelsWithSink.length * minFailPercent) {
      throw err;
    }
    warning ??= err;
  }

  const failedTasks = connectors
    .filter(c => get(c, 'status.tasks')?.find(t => t.state === 'FAILED'));
  if (failedTasks.length) {
    const traces: string[] = [];
    await throttledPromiseAll(5, failedTasks, async c => {
      const trace = get(c, 'status.tasks')?.find(t => t.state === 'FAILED')
        ?.trace.split('\n');
      let reason = trace?.[0] ?? 'none';
      if (trace?.length) {
        const startIdx = trace.findIndex(line => line.startsWith('Caused by:'));
        reason = trace.slice(startIdx).join('\n');
      }
      traces.push(`${c.name}: ${reason}`);

      await fetchJson(
        `http://${KAFKA_CONNECT_HOST}:${KAFKA_CONNECT_PORT}/connectors/${encodeURIComponent(c.name)}/restart?includeTasks=true`,
        { method: 'POST' },
      );
    });

    const err = getErr('verifyMZSinkConnectors: failed tasks', {
      connectors: traces,
    });
    if (failedTasks.length > modelsWithSink.length * minFailPercent) {
      throw err;
    }
    warning ??= err;
  }

  if (warning) {
    printDebug(warning, 'warn');
  }
}

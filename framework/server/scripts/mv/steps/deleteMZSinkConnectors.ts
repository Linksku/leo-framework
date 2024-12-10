import throttledPromiseAll from 'utils/throttledPromiseAll';
import fetchKafkaConnectors from 'utils/infra/fetchKafkaConnectors';
import deleteKafkaConnector from 'utils/infra/deleteKafkaConnector';
import { MZ_SINK_CONNECTOR_PREFIX } from 'consts/mz';
import retry from 'utils/retry';

export default async function deleteMZSinkConnectors() {
  const startTime = performance.now();

  const connectors = await fetchKafkaConnectors(MZ_SINK_CONNECTOR_PREFIX);
  if (connectors.length) {
    printDebug(`Deleting ${connectors.length} MZ sink connectors`, 'highlight');
    await throttledPromiseAll(10, connectors, name => retry(
      () => deleteKafkaConnector(name),
      {
        timeout: 60 * 1000,
        interval: 1000,
        ctx: `deleteMZSinkConnectors: deleteKafkaConnector(${name})`,
      },
    ));

    printDebug(
      `Deleted sink connectors after ${Math.round((performance.now() - startTime) / 100) / 10}s`,
      'success',
    );
  }
}

import pLimit from 'p-limit';

import fetchKafkaConnectors from 'utils/infra/fetchKafkaConnectors';
import deleteKafkaConnector from 'utils/infra/deleteKafkaConnector';
import { MZ_SINK_CONNECTOR_PREFIX } from 'consts/mz';

const limit = pLimit(10);

export default async function deleteMZSinkConnectors() {
  const connectors = await fetchKafkaConnectors(MZ_SINK_CONNECTOR_PREFIX);
  if (connectors.length) {
    printDebug(`Deleting ${connectors.length} connectors`, 'highlight');
    await Promise.all(
      connectors.map(name => limit(() => deleteKafkaConnector(name))),
    );
  }
}

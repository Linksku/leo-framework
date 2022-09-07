import fetchKafkaConnectors from 'utils/infra/fetchKafkaConnectors';
import deleteKafkaConnector from 'utils/infra/deleteKafkaConnector';
import deleteKafkaTopic from 'utils/infra/deleteKafkaTopic';
import {
  DBZ_CONNECTOR_ALL_TABLES,
  DBZ_CONNECTOR_INSERT_ONLY,
  DBZ_TOPIC_PREFIX,
} from 'consts/mz';

export default async function deleteDBZConnectors() {
  printDebug('Deleting DBZ connectors', 'highlight');
  const connectors = await Promise.all([
    fetchKafkaConnectors(DBZ_CONNECTOR_ALL_TABLES),
    fetchKafkaConnectors(DBZ_CONNECTOR_INSERT_ONLY),
  ]);
  for (const name of [...connectors[0], ...connectors[1]]) {
    await deleteKafkaConnector(name);
  }

  printDebug('Deleting Kafka Debezium topics', 'highlight');
  await deleteKafkaTopic(`${DBZ_TOPIC_PREFIX}.*`);
}

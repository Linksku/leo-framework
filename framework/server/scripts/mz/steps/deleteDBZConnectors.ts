import fetchKafkaConnectors from 'utils/infra/fetchKafkaConnectors';
import deleteKafkaConnector from 'utils/infra/deleteKafkaConnector';
import deleteKafkaTopic from 'utils/infra/deleteKafkaTopic';
import deleteBTReplicationSlot from 'utils/infra/deleteBTReplicationSlot';
import {
  DBZ_CONNECTOR_ALL_TABLES,
  DBZ_CONNECTOR_INSERT_ONLY,
  DBZ_TOPIC_PREFIX,
  BT_SLOT_DBZ_ALL_TABLES,
  BT_SLOT_DBZ_INSERT_ONLY,
} from 'consts/mz';

export default async function deleteDBZConnectors() {
  const connectors = await Promise.all([
    fetchKafkaConnectors(DBZ_CONNECTOR_ALL_TABLES),
    fetchKafkaConnectors(DBZ_CONNECTOR_INSERT_ONLY),
  ]);
  for (const name of [...connectors[0], ...connectors[1]]) {
    printDebug(`Deleting connector ${name}`, 'highlight');
    await deleteKafkaConnector(name);
  }

  printDebug(`Deleting Kafka Debezium topics`, 'highlight');
  await deleteKafkaTopic(`${DBZ_TOPIC_PREFIX}.*`);

  await deleteBTReplicationSlot(BT_SLOT_DBZ_ALL_TABLES);
  await deleteBTReplicationSlot(BT_SLOT_DBZ_INSERT_ONLY);
}

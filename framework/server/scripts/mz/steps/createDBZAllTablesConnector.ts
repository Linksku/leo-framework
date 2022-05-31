import EntityModels from 'services/model/allEntityModels';
import { DBZ_CONNECTOR_ALL_TABLES, BT_SLOT_DBZ_ALL_TABLES, BT_PUB_ALL_TABLES, DBZ_TOPIC_PREFIX } from 'consts/mz';
import createDBZKafkaConnector from '../helpers/createDBZKafkaConnector';

export default async function createDBZAllTablesConnector() {
  printDebug(`Creating Kafka Debezium connector for all tables`, 'highlight');
  await createDBZKafkaConnector({
    name: DBZ_CONNECTOR_ALL_TABLES,
    pubName: BT_PUB_ALL_TABLES,
    slotName: BT_SLOT_DBZ_ALL_TABLES,
    Models: EntityModels,
    topicPrefix: DBZ_TOPIC_PREFIX,
  });
}

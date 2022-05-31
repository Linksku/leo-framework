import EntityModels from 'services/model/allEntityModels';
import { DBZ_CONNECTOR_INSERT_ONLY, BT_SLOT_DBZ_INSERT_ONLY, BT_PUB_INSERT_ONLY, DBZ_TOPIC_INSERT_ONLY_PREFIX } from 'consts/mz';
import createDBZKafkaConnector from '../helpers/createDBZKafkaConnector';

export default async function createDBZInsertOnlyConnector() {
  printDebug(`Creating Kafka Debezium connector for insert-only`, 'highlight');
  const modelsWithInsertOnly = EntityModels
    .filter(model => model.withInsertOnlyPublication);
  if (!modelsWithInsertOnly.length) {
    return;
  }

  const additionalConfig = modelsWithInsertOnly.length
    ? {
      transforms: 'ExtractNewRecordState',
      'transforms.ExtractNewRecordState.type': 'io.debezium.transforms.ExtractNewRecordState',
    }
    : {};
  await createDBZKafkaConnector({
    name: DBZ_CONNECTOR_INSERT_ONLY,
    pubName: BT_PUB_INSERT_ONLY,
    slotName: BT_SLOT_DBZ_INSERT_ONLY,
    Models: modelsWithInsertOnly,
    topicPrefix: DBZ_TOPIC_INSERT_ONLY_PREFIX,
    additionalConfig,
  });
}

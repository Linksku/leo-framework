import EntityModels from 'services/model/allEntityModels';
import {
  DBZ_CONNECTOR_INSERT_ONLY,
  BT_SLOT_DBZ_INSERT_ONLY,
  BT_PUB_INSERT_ONLY,
  DBZ_TOPIC_INSERT_ONLY_PREFIX,
} from 'consts/mz';
import { verifyInsertOnlyConnector } from '../helpers/verifyDBZKafkaConnectors';
import createDBZKafkaConnector from '../helpers/createDBZKafkaConnector';

export default async function createDBZInsertOnlyConnector() {
  const startTime = performance.now();
  const insertOnlyModels = EntityModels
    .filter(model => model.useInsertOnlyPublication);
  if (!insertOnlyModels.length) {
    return;
  }

  const { isValid, connector, reason } = await verifyInsertOnlyConnector();
  if (isValid) {
    printDebug('DBZ connector for insert-only tables already created', 'info');
  } else if (connector) {
    throw getErr('createDBZInsertOnlyConnector: existing connector isn\'t valid', { reason });
  } else {
    printDebug('Creating DBZ connector for insert-only tables', 'info');
    await createDBZKafkaConnector({
      name: DBZ_CONNECTOR_INSERT_ONLY,
      pubName: BT_PUB_INSERT_ONLY,
      slotName: BT_SLOT_DBZ_INSERT_ONLY,
      Models: insertOnlyModels,
      topicPrefix: DBZ_TOPIC_INSERT_ONLY_PREFIX,
      additionalConfig: {
        transforms: 'ExtractNewRecordState',
        'transforms.ExtractNewRecordState.type': 'io.debezium.transforms.ExtractNewRecordState',
      },
    });

    printDebug(
      `Created DBZ insert-only connector after ${Math.round((performance.now() - startTime) / 100) / 10}s`,
      'success',
    );
  }
}

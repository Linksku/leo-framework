import EntityModels from 'services/model/allEntityModels';
import {
  DBZ_CONNECTOR_UPDATEABLE,
  BT_SLOT_DBZ_UPDATEABLE,
  BT_PUB_UPDATEABLE,
  DBZ_TOPIC_UPDATEABLE_PREFIX,
} from 'consts/mz';
import { verifyUpdateableConnector } from '../helpers/verifyDBZKafkaConnectors';
import createDBZKafkaConnector from '../helpers/createDBZKafkaConnector';

export default async function createDBZUpdateableConnector() {
  const startTime = performance.now();
  const updateableModels = EntityModels
    .filter(model => !model.useInsertOnlyPublication);
  if (!updateableModels.length) {
    return;
  }

  const { isValid, connector, reason } = await verifyUpdateableConnector();
  if (isValid) {
    printDebug('DBZ connector for updateable tables already created', 'info');
  } else if (connector) {
    throw getErr('createDBZUpdateableConnector: existing connector isn\'t valid', { reason });
  } else {
    printDebug('Creating DBZ connector for updateable tables', 'info');
    await createDBZKafkaConnector({
      name: DBZ_CONNECTOR_UPDATEABLE,
      pubName: BT_PUB_UPDATEABLE,
      slotName: BT_SLOT_DBZ_UPDATEABLE,
      Models: updateableModels,
      topicPrefix: DBZ_TOPIC_UPDATEABLE_PREFIX,
    });

    printDebug(`Created DBZ updateable tables connector after ${Math.round((performance.now() - startTime) / 100) / 10}s`, 'success');
  }
}

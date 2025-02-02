import EntityModels from 'core/models/allEntityModels';
import waitForKafkaConnectReady from 'utils/infra/waitForKafkaConnectReady';
import {
  DBZ_CONNECTOR_UPDATEABLE,
  BT_SLOT_DBZ_UPDATEABLE,
  BT_PUB_UPDATEABLE,
  DBZ_TOPIC_UPDATEABLE_PREFIX,
  DBZ_CONNECTOR_INSERT_ONLY,
  BT_SLOT_DBZ_INSERT_ONLY,
  BT_PUB_INSERT_ONLY,
  DBZ_TOPIC_INSERT_ONLY_PREFIX,
  DBZ_FOR_UPDATEABLE,
  DBZ_FOR_INSERT_ONLY,
} from 'consts/mz';
import { verifyUpdateableConnector, verifyInsertOnlyConnector } from '../helpers/verifyDBZKafkaConnectors';
import createDBZKafkaConnector from '../helpers/createDBZKafkaConnector';

async function createDBZUpdateableConnector() {
  if (!DBZ_FOR_UPDATEABLE) {
    return;
  }

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

    printDebug(
      `Created DBZ updateable tables connector after ${Math.round((performance.now() - startTime) / 100) / 10}s`,
      'success',
    );
  }
}

async function createDBZInsertOnlyConnector() {
  if (!DBZ_FOR_INSERT_ONLY) {
    return;
  }

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

export default async function createDBZConnectors() {
  if (!DBZ_FOR_UPDATEABLE && !DBZ_FOR_INSERT_ONLY) {
    return;
  }

  const updateableModels = DBZ_FOR_UPDATEABLE
    ? EntityModels.filter(model => !model.useInsertOnlyPublication)
    : [];
  const insertOnlyModels = DBZ_FOR_INSERT_ONLY
    ? EntityModels.filter(model => model.useInsertOnlyPublication)
    : [];
  if (!updateableModels.length && !insertOnlyModels.length) {
    printDebug('No DBZ connectors needed', 'highlight');
    return;
  }

  printDebug('Waiting for Kafka Connect to be ready', 'highlight');
  await withErrCtx(waitForKafkaConnectReady(), 'createDBZConnectors: waitForKafkaConnectReady');

  await Promise.all([
    updateableModels.length
      ? withErrCtx(
        createDBZUpdateableConnector(),
        'createDBZConnectors: createDBZUpdateableConnector',
      )
      : null,
    insertOnlyModels.length
      ? withErrCtx(
        createDBZInsertOnlyConnector(),
        'createDBZConnectors: createDBZInsertOnlyConnector',
      )
      : null,
  ]);
}

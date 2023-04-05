import EntityModels from 'services/model/allEntityModels';
import waitForKafkaConnectReady from 'utils/infra/waitForKafkaConnectReady';
import createMZDBZSource from '../helpers/createMZDBZSource';
import createDBZUpdateableConnector from './createDBZUpdateableConnector';
import createDBZInsertOnlyConnector from './createDBZInsertOnlyConnector';

export default async function createMZViewsFromDBZ() {
  printDebug('Waiting for Kafka Connect to be ready', 'highlight');
  await withErrCtx(waitForKafkaConnectReady(), 'createMZViewsFromDBZ: waitForKafkaConnectReady');
  await withErrCtx(createDBZUpdateableConnector(), 'createMZViewsFromDBZ: createDBZUpdateableConnector');
  await withErrCtx(createDBZInsertOnlyConnector(), 'createMZViewsFromDBZ: createDBZInsertOnlyConnector');

  const updateableModels = EntityModels.filter(model => !model.useInsertOnlyPublication);
  const insertOnlyModels = EntityModels.filter(model => model.useInsertOnlyPublication);
  await Promise.all([
    updateableModels.length
      && withErrCtx(createMZDBZSource(updateableModels, false), 'createMZViewsFromDBZ: createMZDBZSource'),
    insertOnlyModels.length
      && withErrCtx(createMZDBZSource(insertOnlyModels, true), 'createMZViewsFromDBZ: createMZDBZSource'),
  ]);
}

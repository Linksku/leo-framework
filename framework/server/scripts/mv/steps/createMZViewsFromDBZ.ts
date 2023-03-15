import EntityModels from 'services/model/allEntityModels';
import waitForKafkaConnectReady from 'utils/infra/waitForKafkaConnectReady';
import withErrCtx from 'utils/withErrCtx';
import createMZDBZSource from '../helpers/createMZDBZSource';
import createDBZUpdateableConnector from './createDBZUpdateableConnector';
import createDBZInsertOnlyConnector from './createDBZInsertOnlyConnector';

export default async function createMZViewsFromDBZ() {
  printDebug('Waiting for Kafka Connect to be ready', 'highlight');
  await withErrCtx(waitForKafkaConnectReady(), 'createMZViewsFromDBZ: waitForKafkaConnectReady');
  await withErrCtx(createDBZUpdateableConnector(), 'createMZViewsFromDBZ: createDBZUpdateableConnector');
  await withErrCtx(createDBZInsertOnlyConnector(), 'createMZViewsFromDBZ: createDBZInsertOnlyConnector');

  const updateableModels = EntityModels.filter(model => !model.useInsertOnlyPublication);
  if (updateableModels.length) {
    await withErrCtx(createMZDBZSource(updateableModels, false), 'createMZViewsFromDBZ: createMZDBZSource');
  }

  const insertOnlyModels = EntityModels.filter(model => model.useInsertOnlyPublication);
  if (insertOnlyModels.length) {
    await withErrCtx(createMZDBZSource(insertOnlyModels, true), 'createMZViewsFromDBZ: createMZDBZSource');
  }
}

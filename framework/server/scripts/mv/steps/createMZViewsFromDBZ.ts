import EntityModels from 'services/model/allEntityModels';
import waitForKafkaConnectReady from 'utils/infra/waitForKafkaConnectReady';
import createMZDBZSource from '../helpers/createMZDBZSource';
import createDBZUpdateableConnector from './createDBZUpdateableConnector';
import createDBZInsertOnlyConnector from './createDBZInsertOnlyConnector';

export default async function createMZViewsFromDBZ() {
  printDebug('Waiting for Kafka Connect to be ready', 'highlight');
  await withErrCtx(waitForKafkaConnectReady(), 'createMZViewsFromDBZ: waitForKafkaConnectReady');

  const updateableModels = EntityModels.filter(model => !model.useInsertOnlyPublication);
  const insertOnlyModels = EntityModels.filter(model => model.useInsertOnlyPublication);
  await Promise.all([
    updateableModels.length
      ? (async () => {
        await withErrCtx(
          createDBZUpdateableConnector(),
          'createMZViewsFromDBZ: createDBZUpdateableConnector',
        );
        await withErrCtx(
          createMZDBZSource(updateableModels, false),
          'createMZViewsFromDBZ: createMZDBZSource updateable',
        );
      })()
      : null,
    insertOnlyModels.length
      ? (async () => {
        await withErrCtx(
          createDBZInsertOnlyConnector(),
          'createMZViewsFromDBZ: createDBZInsertOnlyConnector',
        );
        await withErrCtx(
          createMZDBZSource(insertOnlyModels, true),
          'createMZViewsFromDBZ: createMZDBZSource insert-only',
        );
      })()
      : null,
  ]);
}

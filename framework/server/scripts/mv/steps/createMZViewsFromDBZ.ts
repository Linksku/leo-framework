import EntityModels from 'core/models/allEntityModels';
import {
  DBZ_FOR_UPDATEABLE,
  DBZ_FOR_INSERT_ONLY,
  DBZ_TOPIC_UPDATEABLE_PREFIX,
  DBZ_TOPIC_INSERT_ONLY_PREFIX,
} from 'consts/mz';
import createDBZConnectors from './createDBZConnectors';
import createMZSourcesFromKafka from '../helpers/createMZSourcesFromKafka';

export default async function createMZViewsFromDBZ() {
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
    printDebug('No MZ views from DBZ needed', 'highlight');
    return;
  }

  await withErrCtx(createDBZConnectors(), 'createMZViewsFromDBZ: createDBZConnectors');

  await Promise.all([
    updateableModels.length
      ? withErrCtx(
        createMZSourcesFromKafka(updateableModels, {
          service: 'dbz',
          topicPrefix: DBZ_TOPIC_UPDATEABLE_PREFIX,
          insertOnly: false,
        }),
        'createMZViewsFromDBZ: createMZSourcesFromKafka updateable',
      )
      : null,
    insertOnlyModels.length
      ? withErrCtx(
        createMZSourcesFromKafka(insertOnlyModels, {
          service: 'dbz',
          topicPrefix: DBZ_TOPIC_INSERT_ONLY_PREFIX,
          insertOnly: true,
        }),
        'createMZViewsFromDBZ: createMZSourcesFromKafka insert-only',
      )
      : null,
  ]);
}

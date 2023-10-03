import { ENABLE_DBZ, DBZ_TOPIC_UPDATEABLE_PREFIX, DBZ_TOPIC_INSERT_ONLY_PREFIX } from 'consts/mz';
import EntityModels from 'services/model/allEntityModels';
import listKafkaTopics from 'utils/infra/listKafkaTopics';
import { addHealthcheck } from './HealthcheckManager';

const TOPICS_REGEX = new RegExp(`^(${DBZ_TOPIC_UPDATEABLE_PREFIX}|${DBZ_TOPIC_INSERT_ONLY_PREFIX})`);

// Note: dbz may not create topic messages even if healthcheck passes
addHealthcheck('dbzConnectorTopics', {
  disabled: !ENABLE_DBZ,
  cb: async function dbzConnectorTopicsHealthcheck() {
    // todo: high/hard also check time of last message
    const topics = await listKafkaTopics(TOPICS_REGEX);
    if (!topics.length) {
      throw new Error('dbzConnectorTopicsHealthcheck: no topics');
    }
    const updateableTopics = new Set(
      topics
        .filter(t => t.startsWith(DBZ_TOPIC_UPDATEABLE_PREFIX))
        .map(t => t.slice(DBZ_TOPIC_UPDATEABLE_PREFIX.length)),
    );
    const insertOnlyTopics = new Set(
      topics
        .filter(t => t.startsWith(DBZ_TOPIC_INSERT_ONLY_PREFIX))
        .map(t => t.slice(DBZ_TOPIC_INSERT_ONLY_PREFIX.length)),
    );

    const updateableModels = new Set<string>(
      EntityModels
        .filter(model => !model.useInsertOnlyPublication)
        .map(model => model.type),
    );
    if (updateableModels.size) {
      const missingTopics = [...updateableModels].filter(t => !updateableTopics.has(t));
      const extraTopics = [...updateableTopics].filter(t => !updateableModels.has(t));
      if (missingTopics.length || extraTopics.length) {
        throw getErr('dbzConnectorTopicsHealthcheck: invalid updateable DBZ topics', {
          missingTopics,
          extraTopics,
        });
      }
    }

    const insertOnlyModels = new Set<string>(
      EntityModels
        .filter(model => model.useInsertOnlyPublication)
        .map(model => model.type),
    );
    if (insertOnlyModels.size) {
      const missingTopics = [...insertOnlyModels].filter(t => !insertOnlyTopics.has(t));
      const extraTopics = [...insertOnlyTopics].filter(t => !insertOnlyModels.has(t));
      if (missingTopics.length || extraTopics.length) {
        throw getErr('dbzConnectorTopicsHealthcheck: invalid insert-only DBZ topics', {
          missingTopics,
          extraTopics,
        });
      }
    }
  },
  resourceUsage: 'mid',
  stability: 'mid',
  timeout: 10 * 1000,
});

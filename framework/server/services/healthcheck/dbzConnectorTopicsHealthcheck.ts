import {
  DBZ_FOR_UPDATEABLE,
  DBZ_FOR_INSERT_ONLY,
  DBZ_TOPIC_UPDATEABLE_PREFIX,
  DBZ_TOPIC_INSERT_ONLY_PREFIX,
} from 'consts/mz';
import EntityModels from 'services/model/allEntityModels';
import listKafkaTopics from 'utils/infra/listKafkaTopics';
import getKafkaTopicsWithoutMessages from 'utils/infra/getKafkaTopicsWithoutMessages';
import { addHealthcheck } from './HealthcheckManager';

const DBZ_TOPICS_REGEX = new RegExp(`^(${DBZ_TOPIC_UPDATEABLE_PREFIX}|${DBZ_TOPIC_INSERT_ONLY_PREFIX})`);

// Note: dbz may not create topic messages even if healthcheck passes
addHealthcheck('dbzConnectorTopics', {
  disabled: !DBZ_FOR_UPDATEABLE && !DBZ_FOR_INSERT_ONLY,
  cb: async function dbzConnectorTopicsHealthcheck() {
    const topics = await listKafkaTopics(DBZ_TOPICS_REGEX);
    if (!topics.length) {
      throw new Error('dbzConnectorTopicsHealthcheck: no topics');
    }

    if (DBZ_FOR_UPDATEABLE) {
      const updateableModels = new Set<string>(
        EntityModels
          .filter(model => !model.useInsertOnlyPublication)
          .map(model => model.type),
      );
      if (updateableModels.size) {
        const updateableTopics = new Set(
          topics
            .filter(t => t.startsWith(DBZ_TOPIC_UPDATEABLE_PREFIX))
            .map(t => t.slice(DBZ_TOPIC_UPDATEABLE_PREFIX.length)),
        );

        const missingTopics = [...updateableModels].filter(t => !updateableTopics.has(t));
        const extraTopics = [...updateableTopics].filter(t => !updateableModels.has(t));
        if (missingTopics.length || extraTopics.length) {
          throw getErr('dbzConnectorTopicsHealthcheck: invalid updateable DBZ topics', {
            missingTopics,
            extraTopics,
          });
        }
      }
    }

    if (DBZ_FOR_INSERT_ONLY) {
      const insertOnlyModels = new Set<string>(
        EntityModels
          .filter(model => model.useInsertOnlyPublication)
          .map(model => model.type),
      );
      if (insertOnlyModels.size) {
        const insertOnlyTopics = new Set(
          topics
            .filter(t => t.startsWith(DBZ_TOPIC_INSERT_ONLY_PREFIX))
            .map(t => t.slice(DBZ_TOPIC_INSERT_ONLY_PREFIX.length)),
        );

        const missingTopics = [...insertOnlyModels].filter(t => !insertOnlyTopics.has(t));
        const extraTopics = [...insertOnlyTopics].filter(t => !insertOnlyModels.has(t));
        if (missingTopics.length || extraTopics.length) {
          throw getErr('dbzConnectorTopicsHealthcheck: invalid insert-only DBZ topics', {
            missingTopics,
            extraTopics,
          });
        }
      }
    }
  },
  resourceUsage: 'mid',
  usesResource: 'kafka',
  stability: 'mid',
  timeout: 10 * 1000,
});

addHealthcheck('dbzConnectorTopicMessages', {
  // Doesn't work unless rows are continuously inserted
  disabled: true, // !DBZ_FOR_UPDATEABLE && !DBZ_FOR_INSERT_ONLY,
  cb: async function dbzConnectorTopicMessagesHealthcheck() {
    const remainingTopics = await getKafkaTopicsWithoutMessages(
      DBZ_TOPICS_REGEX,
      1.5 * 60 * 1000,
    );
    if (remainingTopics.length) {
      throw getErr('dbzConnectorTopicMessagesHealthcheck: topics without messages', {
        topics: remainingTopics,
      });
    }
  },
  resourceUsage: 'high',
  usesResource: 'kafka',
  stability: 'low',
  timeout: 2 * 60 * 1000,
});

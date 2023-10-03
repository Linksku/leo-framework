import { ENABLE_DBZ, MZ_SINK_CONSISTENCY_TOPIC_REGEX, MZ_SINK_TOPIC_PREFIX } from 'consts/mz';
import MaterializedViewModels from 'services/model/allMaterializedViewModels';
import listKafkaTopics from 'utils/infra/listKafkaTopics';
import getKafkaTopicsWithoutMessages from 'utils/infra/getKafkaTopicsWithoutMessages';
import { RECREATE_MZ_SINKS_REDIS_KEY } from 'consts/infra';
import { redisMaster } from 'services/redis';
import { addHealthcheck } from './HealthcheckManager';

const TOPICS_REGEX = new RegExp(`^${MZ_SINK_TOPIC_PREFIX}.+(?<!-consistency)$`);

addHealthcheck('mzSinkTopics', {
  cb: async function mzSinkTopicsHealthcheck() {
    if (await redisMaster.exists(RECREATE_MZ_SINKS_REDIS_KEY)) {
      return;
    }

    const topics = await listKafkaTopics(TOPICS_REGEX);
    if (!topics.length) {
      throw new Error('mzSinkTopicsHealthcheck: no topics');
    }
    const modelsWithSinks = MaterializedViewModels
      .filter(m => m.getReplicaTable())
      .map(m => m.tableName);
    if (topics.length !== modelsWithSinks.length) {
      const missingTopics = modelsWithSinks.filter(m => (
        ENABLE_DBZ
          ? !topics.includes(`${MZ_SINK_TOPIC_PREFIX}${m}`)
          : !topics.some(t => t.startsWith(`${MZ_SINK_TOPIC_PREFIX}${m}-`))
      ));
      const extraTopics = topics.filter(t => (
        ENABLE_DBZ
          ? !modelsWithSinks.includes(t.slice(MZ_SINK_TOPIC_PREFIX.length))
          : !modelsWithSinks.some(m => t.startsWith(`${MZ_SINK_TOPIC_PREFIX}${m}-`))
      ));
      const duplicateTopics = ENABLE_DBZ
        ? []
        : modelsWithSinks
          .map(m => topics.filter(t => t.startsWith(`${MZ_SINK_TOPIC_PREFIX}${m}-`)))
          .filter(t => t.length > 1)
          .map(t => t.join(', '));

      throw getErr('mzSinkTopicsHealthcheck: wrong number of topics', {
        missingTopics,
        extraTopics,
        duplicateTopics,
      });
    }
  },
  resourceUsage: 'mid',
  stability: 'mid',
  timeout: 10 * 1000,
});

addHealthcheck('mzSinkTopicMessages', {
  disabled: !ENABLE_DBZ,
  deps: ['mzSinks', 'mzSinkTopics'],
  cb: async function mzSinkTopicMessagesHealthcheck() {
    if (await redisMaster.exists(RECREATE_MZ_SINKS_REDIS_KEY)) {
      return;
    }

    const topics = await getKafkaTopicsWithoutMessages(
      MZ_SINK_CONSISTENCY_TOPIC_REGEX,
      2 * 60 * 1000,
    );
    if (topics.length) {
      throw getErr('mzSinkTopicMessagesHealthcheck: topics without messages', {
        topics,
      });
    }
  },
  // Too unstable and slow. Using monitorMZSinkTopics instead
  onlyForDebug: true,
  resourceUsage: 'high',
  stability: 'low',
  timeout: 2 * 60 * 1000,
});

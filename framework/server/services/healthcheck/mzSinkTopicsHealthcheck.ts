import { MZ_SINK_TOPIC_PREFIX } from 'consts/mz';
import MaterializedViewModels from 'services/model/allMaterializedViewModels';
import listKafkaTopics from 'utils/infra/listKafkaTopics';
import getKafkaTopicsWithoutMessages from 'utils/infra/getKafkaTopicsWithoutMessages';
import { RECREATE_MZ_SINKS_REDIS_KEY } from 'consts/infra';
import { redisMaster } from 'services/redis';
import { addHealthcheck } from './HealthcheckManager';

addHealthcheck('mzSinkTopics', {
  cb: async function mzSinkTopicsHealthcheck() {
    if (await redisMaster.exists(RECREATE_MZ_SINKS_REDIS_KEY)) {
      return;
    }

    const topics = new Set(
      await listKafkaTopics(new RegExp(`^${MZ_SINK_TOPIC_PREFIX}.+(?<!-consistency)$`)),
    );
    if (!topics.size) {
      throw new Error('mzSinkTopicsHealthcheck: no topics');
    }
    const modelsSet = new Set(
      MaterializedViewModels
        .filter(m => m.getReplicaTable())
        .map(m => m.tableName),
    );
    if (topics.size !== modelsSet.size) {
      const missingTopics = [...modelsSet].filter(
        m => !topics.has(`${MZ_SINK_TOPIC_PREFIX}${m}`),
      );
      const extraTopics = [...topics].filter(
        t => !modelsSet.has(t.slice(MZ_SINK_TOPIC_PREFIX.length)),
      );
      throw getErr('mzSinkTopicsHealthcheck: wrong number of topics', {
        missingTopics,
        extraTopics,
      });
    }
  },
  resourceUsage: 'mid',
  stability: 'mid',
  timeout: 10 * 1000,
});

addHealthcheck('mzSinkTopicMessages', {
  deps: ['mzSinks', 'mzSinkTopics'],
  cb: async function mzSinkTopicMessagesHealthcheck() {
    if (await redisMaster.exists(RECREATE_MZ_SINKS_REDIS_KEY)) {
      return;
    }

    const topics = await getKafkaTopicsWithoutMessages(
      new RegExp(`^${MZ_SINK_TOPIC_PREFIX}.+-consistency$`),
      60 * 1000,
    );
    if (topics.length) {
      throw getErr('mzSinkTopicMessagesHealthcheck: topics without messages', {
        topics,
      });
    }
  },
  resourceUsage: 'high',
  stability: 'low',
  timeout: 5 * 60 * 1000,
});

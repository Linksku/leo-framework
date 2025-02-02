import {
  DBZ_FOR_INSERT_ONLY,
  DBZ_FOR_UPDATEABLE,
  MZ_SINK_TOPIC_PREFIX,
  MZ_SINK_TOPIC_REGEX,
  MZ_ENABLE_CONSISTENCY_TOPIC,
  MZ_SINK_CONSISTENCY_TOPIC_REGEX,
} from 'consts/mz';
import MaterializedViewModels from 'core/models/allMaterializedViewModels';
import listKafkaTopics from 'utils/infra/listKafkaTopics';
import getKafkaTopicsWithoutMessages from 'utils/infra/getKafkaTopicsWithoutMessages';
import { RECREATE_MZ_SINKS_REDIS_KEY } from 'consts/infra';
import { redisMaster } from 'services/redis';
import { HAS_MVS } from 'config/__generated__/consts';
import { addHealthcheck } from './HealthcheckManager';

addHealthcheck('mzSinkTopics', {
  disabled: !HAS_MVS,
  run: async function mzSinkTopicsHealthcheck() {
    if (await redisMaster.exists(RECREATE_MZ_SINKS_REDIS_KEY)) {
      return;
    }

    const topics = await listKafkaTopics(MZ_SINK_TOPIC_REGEX);
    if (!topics.length) {
      throw new Error('mzSinkTopicsHealthcheck: no topics');
    }
    const modelsWithSinks = MaterializedViewModels
      .filter(m => m.getReplicaTable());
    if (topics.length !== modelsWithSinks.length) {
      const missingTopics = modelsWithSinks
        .filter(Model => (
          MZ_ENABLE_CONSISTENCY_TOPIC
            ? !topics.includes(MZ_SINK_TOPIC_PREFIX + Model.type)
            : !topics.some(t => t.startsWith(`${MZ_SINK_TOPIC_PREFIX}${Model.type}-`))
        ))
        .map(Model => Model.type);
      const extraTopics = topics.filter(t => (
        MZ_ENABLE_CONSISTENCY_TOPIC
          ? !modelsWithSinks.some(Model => Model.type === t.slice(MZ_SINK_TOPIC_PREFIX.length))
          : !modelsWithSinks.some(Model => t.startsWith(`${MZ_SINK_TOPIC_PREFIX}${Model.type}-`))
      ));
      const duplicateTopics = MZ_ENABLE_CONSISTENCY_TOPIC
        ? []
        : modelsWithSinks
          .map(Model => topics.filter(t => t.startsWith(`${MZ_SINK_TOPIC_PREFIX}${Model.type}-`)))
          .filter(t => t.length > 1)
          .map(t => t.join(', '));

      // Don't know why MZ sometimes creates duplicate topics
      if (missingTopics.length || extraTopics.length) {
        throw getErr('mzSinkTopicsHealthcheck: wrong number of topics', {
          missingTopics,
          extraTopics,
          duplicateTopics,
        });
      }
    }
  },
  resourceUsage: 'mid',
  usesResource: 'kafka',
  stability: 'mid',
  timeout: 10 * 1000,
});

addHealthcheck('mzSinkTopicMessages', {
  disabled: !HAS_MVS || (!DBZ_FOR_UPDATEABLE && !DBZ_FOR_INSERT_ONLY),
  deps: ['mzSinks', 'mzSinkTopics'],
  run: async function mzSinkTopicMessagesHealthcheck() {
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
  usesResource: 'kafka',
  stability: 'low',
  timeout: 2 * 60 * 1000,
});

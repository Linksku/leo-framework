import { MZ_SINK_TOPIC_PREFIX } from 'consts/mz';
import recreateMZSinks from 'scripts/mv/helpers/recreateMZSinks';
import getKafkaTopicsWithoutMessages from 'utils/infra/getKafkaTopicsWithoutMessages';
import listKafkaTopics from 'utils/infra/listKafkaTopics';

export default async function recreateSinkTopicsWithoutMessages() {
  const topics = await listKafkaTopics(new RegExp(`^${MZ_SINK_TOPIC_PREFIX}.+-consistency$`));
  if (!topics.length) {
    return;
  }

  const failingTopics = await getKafkaTopicsWithoutMessages(topics, 30 * 1000);
  if (!failingTopics.length) {
    return;
  }

  const modelTypes = failingTopics.map(
    topic => topic.slice(
      MZ_SINK_TOPIC_PREFIX.length,
      -'-consistency'.length,
    ) as ModelType,
  );
  await recreateMZSinks(modelTypes.map(modelType => getModelClass(modelType)));
}

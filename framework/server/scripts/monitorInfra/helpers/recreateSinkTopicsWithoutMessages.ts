import { MZ_SINK_TOPIC_PREFIX } from 'consts/mz';
import recreateMZSinks from 'scripts/mv/helpers/recreateMZSinks';
import getKafkaTopicsWithoutMessages from 'utils/infra/getKafkaTopicsWithoutMessages';

export default async function recreateSinkTopicsWithoutMessages() {
  const topics = await getKafkaTopicsWithoutMessages(
    new RegExp(`^${MZ_SINK_TOPIC_PREFIX}.+-consistency$`),
    30 * 1000,
  );
  if (!topics.length) {
    return;
  }

  const modelTypes = topics.map(
    topic => topic.slice(
      MZ_SINK_TOPIC_PREFIX.length,
      -'-consistency'.length,
    ) as ModelType,
  );
  await recreateMZSinks(modelTypes.map(modelType => getModelClass(modelType)));
}

import { MZ_SINK_TOPIC_PREFIX } from 'consts/mz';
import deleteKafkaTopics from 'utils/infra/deleteKafkaTopics';
import deleteSchemaRegistry from 'utils/infra/deleteSchemaRegistry';

export default async function deleteMZSinkTopics() {
  printDebug('Deleting Kafka sink topics', 'highlight');
  await deleteKafkaTopics(MZ_SINK_TOPIC_PREFIX);
  await deleteSchemaRegistry(new RegExp(`^${MZ_SINK_TOPIC_PREFIX}\\w+-(key|value)$`));
}
import type { Arguments } from 'yargs';

import deleteKafkaTopics from 'utils/infra/deleteKafkaTopics';

export default async function deleteKafkaTopic(args?: Arguments) {
  const topic = args?._[2];
  if (typeof topic === 'string') {
    await deleteKafkaTopics(topic);
  }
}

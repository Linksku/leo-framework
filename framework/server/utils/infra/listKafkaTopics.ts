import kafkaAdmin from 'services/kafkaAdmin';
import randInt from 'utils/randInt';

export default async function listKafkaTopics(prefixOrRegex: string | RegExp) {
  try {
    // Force refetch topics
    await kafkaAdmin.fetchTopicMetadata({
      topics: [`${randInt(0, Number.MAX_SAFE_INTEGER)}`],
    });
  } catch {}

  const topics = await kafkaAdmin.listTopics();
  return topics
    .filter(topic => (
      typeof prefixOrRegex === 'string'
        ? topic.startsWith(prefixOrRegex)
        : prefixOrRegex.test(topic)
    ))
    .sort();
}

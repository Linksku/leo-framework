import getKafkaAdmin from 'services/getKafkaAdmin';
import randInt from 'utils/randInt';

export default async function listKafkaTopics(prefixOrRegex: string | RegExp) {
  try {
    // Force refetch topics
    await getKafkaAdmin().fetchTopicMetadata({
      topics: [`${randInt(0, Number.MAX_SAFE_INTEGER)}`],
    });
  } catch {}

  const topics = await getKafkaAdmin().listTopics();
  return topics
    .filter(topic => (
      typeof prefixOrRegex === 'string'
        ? topic.startsWith(prefixOrRegex)
        : prefixOrRegex.test(topic)
    ))
    .sort();
}

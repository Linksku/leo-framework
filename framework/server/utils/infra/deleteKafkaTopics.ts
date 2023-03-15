import chunk from 'lodash/chunk';

import kafkaAdmin from 'services/kafkaAdmin';
import retry from 'utils/retry';
import listKafkaTopics from './listKafkaTopics';

export default async function deleteKafkaTopics(prefixOrRegex: string | RegExp) {
  const topics = await listKafkaTopics(prefixOrRegex);
  if (!topics.length) {
    return;
  }

  // todo: low/mid deleteTopics can throw time out error, but time limit wasn't reached
  // Note: if topic has subscribers, topic may be recreated
  await retry(
    async () => {
      try {
        for (const topicChunk of chunk(topics, 10)) {
          // eslint-disable-next-line no-await-in-loop
          await kafkaAdmin.deleteTopics({
            topics: topicChunk,
            timeout: 60 * 1000,
          });
        }
      } catch (err) {
        if (err instanceof Error && (
          err.message.includes('does not exist')
            || err.message.includes('does not host this topic-partition')
        )) {
          // pass
        } else if (err instanceof Error) {
          throw getErr(err, { ctx: `deleteKafkaTopics(${prefixOrRegex})` });
        } else {
          throw err;
        }
      }
      await pause(10 * 1000);

      const nonDeletedTopics = await listKafkaTopics(prefixOrRegex);
      if (nonDeletedTopics.length) {
        throw getErr('Non-deleted topics', {
          topics: nonDeletedTopics,
        });
      }
    },
    {
      timeout: 5 * 60 * 1000,
      interval: 10 * 1000,
      ctx: `deleteKafkaTopics(${prefixOrRegex}): failed to delete topics`,
    },
  );
}

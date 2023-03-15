import kafka from 'services/kafka';
import promiseTimeout from 'utils/promiseTimeout';
import rand from 'utils/rand';

// Note: return value may be Avro encoded
// Note: subscribing to non-existent topics will create the topic
export default async function getKafkaTopicsWithoutMessages(
  topics: string[],
  timeout: number,
): Promise<string[]> {
  if (!topics.length) {
    return [];
  }

  const consumer = kafka.consumer({ groupId: `${rand(0, Number.MAX_SAFE_INTEGER)}` });
  await consumer.connect();
  await consumer.subscribe({ topics });

  const remainingTopics = new Set(topics);
  try {
    await promiseTimeout(
      new Promise<void>((succ, fail) => {
        let timer: NodeJS.Timeout | null = null;
        function resetTimer() {
          if (timer !== null) {
            clearTimeout(timer);
          }

          timer = setTimeout(() => {
            fail();
            wrapPromise(
              consumer.disconnect(),
              'error',
              'getLatestKafkaMessage',
            );
          }, timeout / 2);
        }
        resetTimer();

        consumer.run({
          eachMessage({ topic }) {
            // console.log(message.value?.toString());
            if (remainingTopics.has(topic)) {
              remainingTopics.delete(topic);
            }

            if (remainingTopics.size) {
              resetTimer();
            } else {
              if (timer !== null) {
                clearTimeout(timer);
              }

              succ();
              wrapPromise(
                consumer.disconnect(),
                'error',
                'getLatestKafkaMessage',
              );
            }
          },
        })
          .catch(err => fail(err));
      }),
      timeout,
      new Error('getLatestKafkaMessage: timed out'),
    );
  } catch {
    wrapPromise(
      consumer.disconnect(),
      'error',
      'getLatestKafkaMessage',
    );
  }

  return [...remainingTopics];
}

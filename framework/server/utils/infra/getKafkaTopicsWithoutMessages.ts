import promiseTimeout from 'utils/promiseTimeout';
import createKafkaConsumer from 'utils/infra/createKafkaConsumer';
import listKafkaTopics from 'utils/infra/listKafkaTopics';

// Note: return value may be Avro encoded
// Note: subscribing to non-existent topics will create the topic
export default async function getKafkaTopicsWithoutMessages(
  prefixOrRegex: string | RegExp,
  timeout: number,
): Promise<string[]> {
  const topics = await withErrCtx(
    listKafkaTopics(prefixOrRegex),
    'getKafkaTopicsWithoutMessages: listKafkaTopics',
  );
  if (!topics.length) {
    return [];
  }

  const consumer = createKafkaConsumer({
    ctx: 'getKafkaTopicsWithoutMessages',
    allowAutoTopicCreation: false,
  });
  await withErrCtx(consumer.connect(), 'getKafkaTopicsWithoutMessages: connect');
  await withErrCtx(consumer.subscribe({ topics }), 'getKafkaTopicsWithoutMessages: subscribe');

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
            fail(new Error('getLatestKafkaMessage: timed out'));
            wrapPromise(
              consumer.disconnect(),
              'error',
              'getLatestKafkaMessage',
            );
          }, timeout / 2);
        }
        resetTimer();

        consumer.run({
          eachMessage({ topic, pause }) {
            // console.log(message.value?.toString());
            if (remainingTopics.has(topic)) {
              remainingTopics.delete(topic);
              pause();
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
          .catch(err => {
            // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
            fail(err);
          });
      }),
      {
        timeout,
        getErr: () => new Error('getLatestKafkaMessage: timed out'),
      },
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

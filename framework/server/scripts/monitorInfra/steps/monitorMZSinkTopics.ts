import retry from 'utils/retry';
import listKafkaTopics from 'utils/infra/listKafkaTopics';
import { MZ_SINK_TOPIC_PREFIX } from 'consts/mz';
import kafka from 'services/kafka';
import rand from 'utils/rand';
import recreateMZSinks from 'scripts/mv/helpers/recreateMZSinks';
import { INIT_INFRA_REDIS_KEY } from 'consts/infra';
import { redisMaster } from 'services/redis';

const MAX_TIMEOUT = 30 * 1000;

export default async function monitorMZSinkTopics() {
  printDebug('Monitoring MZ sink topics', 'highlight');

  let topics: string[] = [];
  let lastMessageTimes = Object.create(null);
  const consumer = kafka.consumer({ groupId: `${rand(0, Number.MAX_SAFE_INTEGER)}` });
  consumer.on('consumer.crash', event => {
    ErrorLogger.warn(
      event.payload.error,
      { ctx: 'monitorMZSinkTopics: consumer.crash' },
    );
  });

  async function handleFailingTopics() {
    const failingTopics = Object.entries(lastMessageTimes)
      .filter(pair => performance.now() - pair[1] > MAX_TIMEOUT)
      .map(pair => pair[0]);

    if (failingTopics.length) {
      ErrorLogger.warn(getErr(
        'monitorMZSinkTopics: MZ sink topics failing',
        { topics: failingTopics },
      ));

      let isInitializingInfra = false;
      try {
        isInitializingInfra = !!(await redisMaster.exists(INIT_INFRA_REDIS_KEY));
      } catch {}
      if (!isInitializingInfra) {
        const failingModels = failingTopics.map(topic => {
          const modelType = topic.slice(
            MZ_SINK_TOPIC_PREFIX.length,
            -'-consistency'.length,
          ) as ModelType;
          return getModelClass(modelType);
        });
        await retry(
          () => recreateMZSinks(failingModels),
          {
            times: 3,
            interval: 10 * 1000,
            ctx: 'monitorMZSinkTopics.handleFailingTopics',
          },
        );
        printDebug('Recreated MZ sinks', 'success', undefined, 'always');
        lastMessageTimes = Object.create(null);
      }
    }

    setTimeout(() => {
      wrapPromise(handleFailingTopics(), 'error', 'monitorMZSinkTopics.handleFailingTopics');
    }, 15 * 1000);
  }

  setTimeout(() => {
    wrapPromise(handleFailingTopics(), 'error', 'monitorMZSinkTopics.handleFailingTopics');
  }, 15 * 1000);

  let timer: NodeJS.Timeout | null = null;
  async function connectConsumer() {
    if (timer) {
      clearInterval(timer);
    }

    topics = await listKafkaTopics(new RegExp(`^${MZ_SINK_TOPIC_PREFIX}.+-consistency$`));
    await consumer.connect();
    await consumer.subscribe({ topics });

    try {
      await consumer.run({
        eachMessage({ topic }) {
          lastMessageTimes[topic] = performance.now();
        },
      });
    } catch (err) {
      ErrorLogger.error(err, { ctx: 'monitorMZSinkTopics' });
      lastMessageTimes = Object.create(null);

      await consumer.disconnect();
      await pause(60 * 1000);
      await connectConsumer();
      return;
    }

    timer = setInterval(async () => {
      try {
        const newTopics = await listKafkaTopics(new RegExp(`^${MZ_SINK_TOPIC_PREFIX}.+-consistency$`));
        if (newTopics.length > topics.length) {
          await consumer.disconnect();
          await connectConsumer();
        }
      } catch (err) {
        ErrorLogger.error(err, { ctx: 'monitorMZSinkTopics' });
      }
    }, 10 * 60 * 1000);
  }

  await connectConsumer();
}

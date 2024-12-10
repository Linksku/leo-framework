import { MZ_ENABLE_CONSISTENCY_TOPIC, MZ_SINK_TOPIC_PREFIX } from 'consts/mz';
import type { Consumer } from 'kafkajs';

import getSchemaRegistry from 'services/getSchemaRegistry';
import { API_POST_TIMEOUT } from 'consts/server';
import createKafkaConsumer from 'utils/infra/createKafkaConsumer';
import listKafkaTopics from 'utils/infra/listKafkaTopics';

type ConsumerSub = {
  match: [string, any][],
  resolvePromise: () => void,
  rejectPromise: (err: Error) => void,
  timeoutTimer: NodeJS.Timeout,
};

type ConsumerConfig = {
  consumer: Consumer,
  subscriptions: ConsumerSub[],
  gotFirstMsg: boolean,
  lastSubbedTime: number,
};

const consumerConfigs = Object.create(null) as Partial<Record<
  ModelType,
  ConsumerConfig
>>;

// todo: mid/hard don't create a consumer for every server
export default async function waitForKafkaSinkMsg<
  T extends ModelType,
  P extends ModelPartialExact<ModelTypeToClass<T>, P>,
>(
  modelType: T,
  partial: P,
  { timeout = API_POST_TIMEOUT / 2 }: {
    timeout?: number,
  } = {},
): Promise<void> {
  const startTime = performance.now();
  const createTimeoutTimer = (
    consumerConfig: ConsumerConfig,
    sub: ConsumerSub,
  ) => setTimeout(
    () => {
      const idx = consumerConfig.subscriptions.indexOf(sub);
      if (idx >= 0) {
        consumerConfig.subscriptions.splice(idx, 1);
      }

      sub.rejectPromise(new Error(
        consumerConfig.gotFirstMsg
          ? 'waitForKafkaSinkMsg: timed out'
          : 'waitForKafkaSinkMsg: timed out before first message',
      ));
    },
    timeout - (performance.now() - startTime),
  );

  const oldConsumerConfig = consumerConfigs[modelType];
  if (oldConsumerConfig) {
    oldConsumerConfig.lastSubbedTime = performance.now();
    return new Promise((succ, fail) => {
      const sub: ConsumerSub = {
        match: Object.entries(partial),
        resolvePromise: succ,
        rejectPromise: fail,
        timeoutTimer: 0 as unknown as NodeJS.Timeout,
      };
      sub.timeoutTimer = createTimeoutTimer(oldConsumerConfig, sub);
      oldConsumerConfig.subscriptions.push(sub);
    });
  }

  const consumer = createKafkaConsumer({
    ctx: 'waitForKafkaSinkMsg',
    allowAutoTopicCreation: false,
  });
  const newConsumerConfig = consumerConfigs[modelType] = {
    consumer,
    subscriptions: [] as ConsumerSub[],
    gotFirstMsg: false,
    lastSubbedTime: performance.now(),
  };

  consumer.on('consumer.crash', event => {
    ErrorLogger.warn(
      event.payload.error,
      { ctx: 'waitForKafkaSinkMsg: consumer.crash' },
    );
  });

  try {
    let modelTopic = MZ_SINK_TOPIC_PREFIX + modelType;
    if (!MZ_ENABLE_CONSISTENCY_TOPIC) {
      const topics = await listKafkaTopics(`${modelTopic}-`);
      if (!process.env.PRODUCTION && topics.length > 1) {
        throw getErr('waitForKafkaSinkMsg: too many topics', { topics });
      }
      if (!topics.length) {
        throw new Error('waitForKafkaSinkMsg: missing topics');
      }
      modelTopic = topics[0];
    }

    await consumer.connect();
    await consumer.subscribe({
      topic: modelTopic,
    });

    await consumer.run({
      async eachMessage({ topic, message }) {
        const msgModel = (
          MZ_ENABLE_CONSISTENCY_TOPIC
            ? topic.slice(MZ_SINK_TOPIC_PREFIX.length)
            : topic.slice(MZ_SINK_TOPIC_PREFIX.length).split('-')[0]
        ) as ModelType;
        const consumerConfig = consumerConfigs[msgModel];

        if (!consumerConfig || !message.value) {
          return;
        }
        consumerConfig.gotFirstMsg = true;

        if (!process.env.PRODUCTION && !consumerConfig) {
          throw new Error(`waitForKafkaSinkMsg: missing consumerConfig for ${msgModel}`);
        }
        if (!consumerConfig?.subscriptions.length) {
          return;
        }

        const schemaRegistry = await getSchemaRegistry();
        const decoded = await schemaRegistry.decode(message.value);
        outer: for (let i = 0; i < consumerConfig.subscriptions.length; i++) {
          const sub = consumerConfig.subscriptions[i];
          for (const pair of sub.match) {
            if (decoded[pair[0]] !== pair[1]) {
              continue outer;
            }
          }

          sub.resolvePromise();
          clearTimeout(sub.timeoutTimer);
          consumerConfig.subscriptions.splice(i, 1);
          i--;
        }
      },
    });
  } catch (_err) {
    const err = getErr(_err, { ctx: 'waitForKafkaSinkMsg' });
    ErrorLogger.error(err);

    try {
      await consumer.disconnect();
    } catch {}

    const consumerConfig = consumerConfigs[modelType];
    if (consumerConfig) {
      for (const sub of consumerConfig.subscriptions) {
        sub.rejectPromise(err);
      }
      delete consumerConfigs[modelType];
    }
    throw err;
  }

  if (newConsumerConfig) {
    if (performance.now() - startTime > timeout) {
      throw new Error('waitForKafkaSinkMsg: timed out before first message');
    }
    return new Promise((succ, fail) => {
      const sub: ConsumerSub = {
        match: Object.entries(partial),
        resolvePromise: succ,
        rejectPromise: fail,
        timeoutTimer: 0 as unknown as NodeJS.Timeout,
      };
      sub.timeoutTimer = createTimeoutTimer(newConsumerConfig, sub);
      newConsumerConfig.subscriptions.push(sub);
    });
  }
  return undefined;
}

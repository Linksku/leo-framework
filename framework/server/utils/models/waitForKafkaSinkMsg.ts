import { MZ_SINK_TOPIC_PREFIX } from 'consts/mz';
import type { Consumer } from 'kafkajs';

import schemaRegistry from 'services/schemaRegistry';
import { API_POST_TIMEOUT } from 'settings';
import createKafkaConsumer from 'utils/infra/createKafkaConsumer';

type ConsumerSub = {
  match: [string, any][],
  resolvePromise: () => void,
  rejectPromise: (err: Error) => void,
  timer: NodeJS.Timeout,
};

const consumerConfigs = Object.create(null) as Partial<Record<
  ModelType,
  {
    consumer: Consumer,
    subscriptions: ConsumerSub[],
    lastSubbed: number,
  }
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
  if (TS.hasProp(consumerConfigs, modelType)) {
    const consumerConfig = consumerConfigs[modelType];
    consumerConfig.lastSubbed = performance.now();
    return new Promise((succ, fail) => {
      const sub: ConsumerSub = {
        match: Object.entries(partial),
        resolvePromise: succ,
        rejectPromise: fail,
        timer: setTimeout(() => {
          const idx = consumerConfig.subscriptions.indexOf(sub);
          if (idx >= 0) {
            consumerConfig.subscriptions.splice(idx, 1);
          }
          sub.rejectPromise(new Error('waitForKafkaSinkMsg: timed out'));
        }, timeout),
      };
      consumerConfig.subscriptions.push(sub);
    });
  }

  const consumer = createKafkaConsumer({ ctx: 'waitForKafkaSinkMsg' });
  consumerConfigs[modelType] = {
    consumer,
    subscriptions: [],
    lastSubbed: performance.now(),
  };

  consumer.on('consumer.crash', event => {
    ErrorLogger.warn(
      event.payload.error,
      { ctx: 'waitForKafkaSinkMsg: consumer.crash' },
    );
  });

  try {
    await consumer.connect();
    await consumer.subscribe({ topic: `${MZ_SINK_TOPIC_PREFIX}${modelType}` });

    await consumer.run({
      async eachMessage({ topic, message }) {
        if (!message.value) {
          return;
        }

        const modelType2 = topic.slice(MZ_SINK_TOPIC_PREFIX.length) as ModelType;
        const consumerConfig = consumerConfigs[modelType2];
        if (!consumerConfig?.subscriptions.length) {
          return;
        }

        const decoded = await schemaRegistry.decode(message.value);
        outer: for (let i = 0; i < consumerConfig.subscriptions.length; i++) {
          const sub = consumerConfig.subscriptions[i];
          for (const pair of sub.match) {
            if (decoded[pair[0]] !== pair[1]) {
              continue outer;
            }
          }

          sub.resolvePromise();
          clearTimeout(sub.timer);
          consumerConfig.subscriptions.splice(i, 1);
          i--;
        }
      },
    });
  } catch (_err) {
    const err = getErr(_err, { ctx: 'waitForKafkaSinkMsg' });
    ErrorLogger.error(err);

    await consumer.disconnect();
    const consumerConfig = consumerConfigs[modelType];
    if (consumerConfig) {
      for (const sub of consumerConfig.subscriptions) {
        sub.rejectPromise(err);
      }
      delete consumerConfigs[modelType];
    }
    throw err;
  }

  const newConsumerConfig = consumerConfigs[modelType];
  if (newConsumerConfig) {
    return new Promise((succ, fail) => {
      const sub: ConsumerSub = {
        match: Object.entries(partial),
        resolvePromise: succ,
        rejectPromise: fail,
        timer: setTimeout(() => {
          const idx = newConsumerConfig.subscriptions.indexOf(sub);
          if (idx >= 0) {
            newConsumerConfig.subscriptions.splice(idx, 1);
          }
          sub.rejectPromise(new Error('waitForKafkaSinkMsg: timed out'));
        }, timeout),
      };
      newConsumerConfig.subscriptions.push(sub);
    });
  }
  return undefined;
}

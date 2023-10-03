import type { ConsumerConfig } from 'kafkajs';
import kafka from 'services/kafka';
import randInt from 'utils/randInt';

export default function createKafkaConsumer({ groupId, ctx, ...consumerConfig }: {
  groupId?: string,
  ctx: string,
} & Partial<ConsumerConfig>) {
  const consumer = kafka.consumer({
    groupId: groupId ?? `${randInt(0, Number.MAX_SAFE_INTEGER)}`,
    ...consumerConfig,
  });
  consumer.on('consumer.crash', event => {
    ErrorLogger.warn(
      event.payload.error,
      { ctx: `${ctx}: consumer.crash` },
    );
  });

  return consumer;
}

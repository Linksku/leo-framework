import knexMZ from 'services/knex/knexMZ';
import { MZ_ENABLE_CONSISTENCY_TOPIC, MZ_SINK_TOPIC_PREFIX, MZ_SINK_PREFIX } from 'consts/mz';
import {
  KAFKA_BROKER_INTERNAL_HOST,
  KAFKA_BROKER_INTERNAL_PORT,
  SCHEMA_REGISTRY_PORT,
} from 'consts/mz';
import retry from 'utils/retry';
import deleteKafkaTopics from 'utils/infra/deleteKafkaTopics';
import { KAFKA_NUM_BROKERS } from 'consts/infra';

export default async function createMZSink({ modelType, primaryKey }: {
  modelType: string,
  primaryKey: string[],
}) {
  if (!MZ_ENABLE_CONSISTENCY_TOPIC) {
    const deletedCount = await deleteKafkaTopics(new RegExp(`^${MZ_SINK_TOPIC_PREFIX}${modelType}-`));
    if (deletedCount) {
      printDebug(`Deleted ${deletedCount} old Kafka ${plural('topic', deletedCount)} for sink ${MZ_SINK_TOPIC_PREFIX}${modelType}`);
    }
  }

  await retry(
    async () => {
      try {
        await knexMZ.raw(`
          CREATE SINK ?? FROM ??
          INTO KAFKA BROKER '${KAFKA_BROKER_INTERNAL_HOST}:${KAFKA_BROKER_INTERNAL_PORT}'
          TOPIC '${MZ_SINK_TOPIC_PREFIX}${modelType}' KEY(${primaryKey.map(_ => '??').join(', ')}) NOT ENFORCED
          WITH (
            partition_count=${2 * Math.min(3, KAFKA_NUM_BROKERS)},
            replication_factor=${Math.min(3, KAFKA_NUM_BROKERS)},
            reuse_topic=${MZ_ENABLE_CONSISTENCY_TOPIC ? 'true' : 'false'}
          )
          FORMAT AVRO USING CONFLUENT SCHEMA REGISTRY 'http://schema-registry:${SCHEMA_REGISTRY_PORT}'
          ENVELOPE UPSERT
        `, [
          MZ_SINK_PREFIX + modelType,
          modelType,
          ...primaryKey,
        ]);
      } catch (err) {
        if (!(err instanceof Error && err.message.includes('already exists'))) {
          throw err instanceof Error
            ? getErr(err, { ctx: `createMZSink(${modelType})` })
            : err;
        }
      }
    },
    {
      timeout: 60 * 1000,
      interval: 1000,
      ctx: `createMZSink(${modelType}): create sink`,
    },
  );
}

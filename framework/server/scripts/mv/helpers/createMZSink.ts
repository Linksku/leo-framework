import knexMZ from 'services/knex/knexMZ';
import { ENABLE_DBZ, MZ_SINK_TOPIC_PREFIX, MZ_SINK_PREFIX } from 'consts/mz';
import { KAFKA_BROKER_INTERNAL_PORT, SCHEMA_REGISTRY_PORT } from 'consts/infra';
import retry from 'utils/retry';
import deleteKafkaTopics from 'utils/infra/deleteKafkaTopics';

export default async function createMZSink({ modelType, primaryKey }: {
  modelType: string,
  primaryKey: string[],
}) {
  if (!ENABLE_DBZ) {
    const deletedCount = await deleteKafkaTopics(new RegExp(`^${MZ_SINK_TOPIC_PREFIX}${modelType}-`));
    if (deletedCount) {
      printDebug(`Deleted ${deletedCount} old Kafka topic${deletedCount === 1 ? '' : 's'} for sink ${MZ_SINK_TOPIC_PREFIX}${modelType}`);
    }
  }

  await retry(
    async () => {
      try {
        await knexMZ.raw(`
          CREATE SINK ?? FROM ??
          INTO KAFKA BROKER 'broker:${KAFKA_BROKER_INTERNAL_PORT}'
          TOPIC '${MZ_SINK_TOPIC_PREFIX}${modelType}' KEY(${primaryKey.map(_ => '??')}) NOT ENFORCED
          WITH (reuse_topic=${ENABLE_DBZ ? 'true' : 'false'})
          FORMAT AVRO USING CONFLUENT SCHEMA REGISTRY 'http://schema-registry:${SCHEMA_REGISTRY_PORT}'
          ENVELOPE UPSERT
        `, [
          `${MZ_SINK_PREFIX}${modelType}`,
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

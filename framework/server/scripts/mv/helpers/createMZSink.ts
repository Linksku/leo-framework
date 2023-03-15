import knexMZ from 'services/knex/knexMZ';
import { MZ_SINK_TOPIC_PREFIX, MZ_SINK_PREFIX } from 'consts/mz';
import { KAFKA_BROKER_INTERNAL_PORT, SCHEMA_REGISTRY_PORT } from 'consts/infra';
import retry from 'utils/retry';

export default async function createMZSink({ name, primaryKey }: {
  name: string,
  primaryKey: string[],
}) {
  await retry(
    async () => {
      try {
        await knexMZ.raw(`
          CREATE SINK ?? FROM ??
          INTO KAFKA BROKER 'broker:${KAFKA_BROKER_INTERNAL_PORT}'
          TOPIC '${MZ_SINK_TOPIC_PREFIX}${name}' KEY(${primaryKey.map(_ => '??')}) NOT ENFORCED
          WITH (reuse_topic=true)
          FORMAT AVRO USING CONFLUENT SCHEMA REGISTRY 'http://schema-registry:${SCHEMA_REGISTRY_PORT}'
          ENVELOPE UPSERT
        `, [
          `${MZ_SINK_PREFIX}${name}`,
          name,
          ...primaryKey,
        ]);
      } catch (err) {
        if (!(err instanceof Error && err.message.includes('already exists'))) {
          throw err instanceof Error
            ? getErr(err, { ctx: `createMZSink(${name})` })
            : err;
        }
      }
    },
    {
      timeout: 60 * 1000,
      interval: 1000,
      ctx: `createMZSink(${name}): create sink`,
    },
  );
}

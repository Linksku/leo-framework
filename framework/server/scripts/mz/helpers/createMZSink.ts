import knexMZ from 'services/knex/knexMZ';
import { MZ_SINK_TOPIC_PREFIX, MZ_SINK_PREFIX } from 'consts/mz';

export default async function createMZSink({ name, primaryKey }: {
  name: string,
  primaryKey: string[],
}) {
  await knexMZ.raw(`
    CREATE SINK ?? FROM ??
    INTO KAFKA BROKER 'broker:${process.env.KAFKA_BROKER_INTERNAL_PORT}'
    TOPIC '${MZ_SINK_TOPIC_PREFIX}${name}' KEY(${primaryKey.map(_ => '??')}) NOT ENFORCED
    FORMAT AVRO USING CONFLUENT SCHEMA REGISTRY 'http://schema-registry:${process.env.SCHEMA_REGISTRY_PORT}'
    ENVELOPE UPSERT
  `, [
    `${MZ_SINK_PREFIX}${name}`,
    name,
    ...primaryKey,
  ]);
}

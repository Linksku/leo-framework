import knexMZ from 'services/knex/knexMZ';
import {
  DBZ_TOPIC_PREFIX,
  DBZ_TOPIC_INSERT_ONLY_PREFIX,
  MZ_TIMESTAMP_FREQUENCY,
  MV_INSERT_ONLY_SUFFIX,
} from 'consts/mz';

export default async function createMZDBZSource(Models: EntityClass[], insertOnly: boolean) {
  // todo: mid/mid create view only if used by an MV
  for (const model of Models) {
    await knexMZ.raw(`
      CREATE SOURCE "${model.tableName}${insertOnly ? MV_INSERT_ONLY_SUFFIX : ''}"
      FROM KAFKA BROKER 'broker:${process.env.KAFKA_BROKER_INTERNAL_PORT}'
      TOPIC '${insertOnly ? DBZ_TOPIC_INSERT_ONLY_PREFIX : DBZ_TOPIC_PREFIX}${model.tableName}'
      WITH (
        timestamp_frequency_ms = ${MZ_TIMESTAMP_FREQUENCY}
      )
      FORMAT AVRO USING CONFLUENT SCHEMA REGISTRY 'http://schema-registry:8081'
      ENVELOPE ${insertOnly ? 'NONE' : 'DEBEZIUM'}
    `);
  }
}

import merge from 'lodash/merge';

import ucFirst from 'utils/ucFirst';
import fetchJson from 'utils/fetchJson';
import generateUuid from 'utils/generateUuid';
import { MZ_SINK_CONNECTOR_PREFIX, MZ_SINK_TOPIC_PREFIX } from 'consts/mz';

const BASE_KAFKA_CONNECT_CONFIG = {
  'connector.class': 'io.confluent.connect.jdbc.JdbcSinkConnector',
  'dialect.name': 'PostgreSqlDatabaseDialect',
  'key.converter': 'io.confluent.connect.avro.AvroConverter',
  'key.converter.schema.registry.url': `http://schema-registry:${process.env.SCHEMA_REGISTRY_PORT}`,
  'value.converter': 'io.confluent.connect.avro.AvroConverter',
  'value.converter.schema.registry.url': `http://schema-registry:${process.env.SCHEMA_REGISTRY_PORT}`,
  'insert.mode': 'upsert',
  'delete.enabled': 'true',
  'auto.create': 'true',
  'auto.evolve': 'false',
  'errors.retry.timeout': -1,
  // 'max.retries': 2,
  // 'retry.backoff.ms': 5000,
  'connection.url': `jdbc:postgresql://${process.env.INTERNAL_DOCKER_HOST}:${process.env.PG_RR_PORT}/${process.env.PG_RR_DB}`,
  'connection.user': process.env.PG_RR_USER,
  'connection.password': process.env.PG_RR_PASS,
  'pk.mode': 'record_key',
};

export default async function createMZSinkConnector({
  name,
  replicaTable,
  primaryKey,
  timestampProps = [],
}: {
  name: string,
  replicaTable: string,
  primaryKey: string[],
  timestampProps?: string[],
}) {
  const transforms = timestampProps.map(prop => `TimestampConverter${ucFirst(prop)}`).join(',');
  const res = await fetchJson(
    `http://${process.env.KAFKA_CONNECT_HOST}:${process.env.KAFKA_CONNECT_PORT}/connectors/${MZ_SINK_CONNECTOR_PREFIX}${name}_${generateUuid('hex')}/config`,
    'PUT',
    {
      ...BASE_KAFKA_CONNECT_CONFIG,
      'topics.regex': `^${MZ_SINK_TOPIC_PREFIX}${name}-.+`,
      'table.name.format': replicaTable,
      'pk.fields': primaryKey.join(','),
      transforms,
      ...merge({}, ...timestampProps.map(prop => {
        const transformName = `TimestampConverter${ucFirst(prop)}`;
        return {
          // unix.precision was added in Jan 2022, but not released yet, so needed to build custom transform.
          [`transforms.${transformName}.type`]: 'org.apache.kafka.connect.transforms.TimestampConverterMicro$Value',
          [`transforms.${transformName}.target.type`]: 'Timestamp',
          [`transforms.${transformName}.unix.precision`]: 'microseconds',
          [`transforms.${transformName}.field`]: prop,
        };
      })),
    },
  );
  if (res.status >= 400) {
    throw new Error(`createMZSinkConnector: failed to create connector: ${JSON.stringify(res.data)}`);
  }
}

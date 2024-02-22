import merge from 'lodash/merge.js';

import ucFirst from 'utils/ucFirst';
import fetchJson from 'utils/fetchJson';
import generateUuid from 'utils/generateUuid';
import { MZ_ENABLE_CONSISTENCY_TOPIC, MZ_SINK_CONNECTOR_PREFIX, MZ_SINK_TOPIC_PREFIX } from 'consts/mz';
import {
  SCHEMA_REGISTRY_PORT,
  INTERNAL_DOCKER_HOST,
  PG_RR_PORT,
  PG_RR_DB,
  KAFKA_CONNECT_HOST,
  KAFKA_CONNECT_PORT,
} from 'consts/infra';

const BASE_KAFKA_CONNECT_CONFIG = {
  'connector.class': 'io.confluent.connect.jdbc.JdbcSinkConnector',
  'dialect.name': 'PostgreSqlDatabaseDialect',
  'key.converter': 'io.confluent.connect.avro.AvroConverter',
  'key.converter.schema.registry.url': `http://schema-registry:${SCHEMA_REGISTRY_PORT}`,
  'value.converter': 'io.confluent.connect.avro.AvroConverter',
  'value.converter.schema.registry.url': `http://schema-registry:${SCHEMA_REGISTRY_PORT}`,
  'insert.mode': 'upsert',
  'delete.enabled': 'true',
  'auto.create': 'false',
  'auto.evolve': 'false',
  'errors.retry.timeout': -1,
  'max.retries': 100, // 5min
  'connection.url': `jdbc:postgresql://${INTERNAL_DOCKER_HOST}:${PG_RR_PORT}/${PG_RR_DB}`,
  'connection.user': process.env.PG_RR_USER,
  'connection.password': process.env.PG_RR_PASS,
  'pk.mode': 'record_key',
};

// todo: mid/hard sometimes all healthchecks pass, but no data get written to sink topics
export default async function createMZSinkConnector({
  name,
  replicaTable,
  primaryKey,
  timestampProps = [],
}: {
  name: string,
  replicaTable: string,
  primaryKey: string | string[],
  timestampProps?: string[],
}) {
  const transforms = [
    ...timestampProps.map(prop => `TimestampConverter${ucFirst(prop)}`),
    'ReplaceField',
  ];
  const res = await fetchJson(
    `http://${KAFKA_CONNECT_HOST}:${KAFKA_CONNECT_PORT}/connectors/${MZ_SINK_CONNECTOR_PREFIX}${name}_${generateUuid('hex')}/config`,
    {
      method: 'PUT',
      params: {
        ...BASE_KAFKA_CONNECT_CONFIG,
        'topics.regex': MZ_ENABLE_CONSISTENCY_TOPIC
          ? `^${MZ_SINK_TOPIC_PREFIX}${name}$`
          // Sync with waitForKafkaSinkMsg
          : `^${MZ_SINK_TOPIC_PREFIX}${name}-[a-zA-Z0-9-]+$`,
        'table.name.format': replicaTable,
        'pk.fields': Array.isArray(primaryKey) ? primaryKey.join(',') : primaryKey,
        transforms: transforms.join(','),
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
        'transforms.ReplaceField.type': 'org.apache.kafka.connect.transforms.ReplaceField$Value',
        'transforms.ReplaceField.blacklist': 'transaction',
      },
    },
  );
  if (res.status >= 400) {
    throw getErr(
      `createMZSinkConnector: failed to create connector (${res.status})`,
      { data: res.data },
    );
  }
}

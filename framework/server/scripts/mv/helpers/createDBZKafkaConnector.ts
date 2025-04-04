import fetchJson from 'utils/fetchJson';
import generateUuid from 'utils/generateUuid';
import retry from 'utils/retry';
import fetchKafkaConnectors from 'utils/infra/fetchKafkaConnectors';
import {
  INTERNAL_DOCKER_HOST,
  PG_BT_PORT,
  PG_BT_DB,
  PG_BT_SCHEMA,
  KAFKA_NUM_BROKERS,
} from 'consts/infra';
import {
  KAFKA_CONNECT_HOST,
  KAFKA_CONNECT_PORT,
  SCHEMA_REGISTRY_PORT,
} from 'consts/mz';
import listKafkaTopics from 'utils/infra/listKafkaTopics';
import { DBZ_ENABLE_SKIP_COLUMNS } from 'consts/mz';

export default async function createDBZKafkaConnector({
  name,
  pubName,
  slotName,
  Models,
  topicPrefix,
  additionalConfig = {},
}: {
  name: string,
  pubName: string,
  slotName: string,
  Models: EntityClass[],
  topicPrefix: string,
  additionalConfig?: ObjectOf<any>,
}) {
  const existingConnectors = await fetchKafkaConnectors(name);
  if (!existingConnectors.length) {
    const connectorName = `${name}_${generateUuid('hex')}`;
    const res = await fetchJson(
      `http://${KAFKA_CONNECT_HOST}:${KAFKA_CONNECT_PORT}/connectors/${connectorName}/config`,
      {
        method: 'PUT',
        params: {
          'connector.class': 'io.debezium.connector.postgresql.PostgresConnector',
          'plugin.name': 'pgoutput',
          'database.hostname': INTERNAL_DOCKER_HOST,
          'database.port': PG_BT_PORT,
          'database.user': process.env.PG_BT_USER,
          'database.password': process.env.PG_BT_PASS,
          'database.dbname': PG_BT_DB,
          'database.server.name': PG_BT_DB,
          'table.include.list': Models.map(
            model => `^${PG_BT_SCHEMA}.${model.tableName}$`,
          ).join(','),
          'column.exclude.list': DBZ_ENABLE_SKIP_COLUMNS
            ? Models.flatMap(model => model.skipColumnsForMZ.map(
              col => `^${PG_BT_SCHEMA}.${model.tableName}.${col}$`,
            )).join(',')
            : '',
          'publication.name': pubName,
          'slot.name': slotName,
          'slot.max.retries': 10_000,
          'snapshot.mode': 'initial',
          // From https://stackoverflow.com/a/58018666
          'max.batch.size': 20_480,
          'max.queue.size': 81_290,
          'topic.prefix': PG_BT_DB,
          'topic.creation.enable': true,
          'topic.creation.default.replication.factor': Math.min(3, KAFKA_NUM_BROKERS),
          // Multiple of number of brokers
          'topic.creation.default.partitions': 2 * Math.min(3, KAFKA_NUM_BROKERS),
          'topic.creation.default.cleanup.policy': 'compact',
          // With cleanup, if MZ restarts, sources will be missing rows
          'topic.creation.default.retention.ms': -1,
          'topic.creation.default.compression.type': 'uncompressed',
          'key.converter': 'io.confluent.connect.avro.AvroConverter',
          'key.converter.schema.registry.url': `http://schema-registry:${SCHEMA_REGISTRY_PORT}`,
          'value.converter': 'io.confluent.connect.avro.AvroConverter',
          'value.converter.schema.registry.url': `http://schema-registry:${SCHEMA_REGISTRY_PORT}`,
          'value.converter.schemas.enable': false,
          'transforms.ByLogicalTableRouter.type': 'io.debezium.transforms.ByLogicalTableRouter',
          'transforms.ByLogicalTableRouter.topic.regex': `${PG_BT_DB}\\.${PG_BT_SCHEMA}\\.(.*)`,
          'transforms.ByLogicalTableRouter.topic.replacement': `${topicPrefix}$1`,
          // Needed for sharding apparently.
          'transforms.ByLogicalTableRouter.key.enforce.uniqueness': false,
          ...additionalConfig,
          transforms: additionalConfig.transforms ? `${additionalConfig.transforms},ByLogicalTableRouter` : 'ByLogicalTableRouter',
        },
      },
    );
    if (res.status >= 400) {
      throw getErr(
        `createDBZKafkaConnector(${name}): failed to create connector (${res.status})`,
        { data: res.data },
      );
    }

    await retry(
      async () => {
        const connector = await fetchJson(
          `http://${KAFKA_CONNECT_HOST}:${KAFKA_CONNECT_PORT}/connectors/${connectorName}`,
        );
        if (connector.status >= 400) {
          throw new Error(`Connector status ${connector.status}`);
        }
      },
      {
        timeout: 60 * 1000,
        interval: 1000,
        ctx: `createDBZKafkaConnector: start "${connectorName}"`,
      },
    );
  }

  await retry(
    async () => {
      const topics = await listKafkaTopics(topicPrefix);
      const missingTopics = Models
        .map(m => m.tableName)
        .filter(m => !topics.some(t => t.startsWith(topicPrefix + m)));
      if (missingTopics.length) {
        // Note: if there aren't rows, DBZ doesn't create the topic.
        throw getErr('Missing topics', { missingTopics });
      }
    },
    {
      timeout: 10 * 60 * 1000,
      interval: 1000,
      ctx: `createDBZKafkaConnector(${name}): check created topics`,
    },
  );
}

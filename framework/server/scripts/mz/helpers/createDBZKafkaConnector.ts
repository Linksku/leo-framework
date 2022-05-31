import childProcess from 'child_process';
import { promisify } from 'util';

import fetchJson from 'utils/fetchJson';
import generateUuid from 'utils/generateUuid';
import retry from 'utils/retry';
import fetchKafkaConnectors from 'utils/infra/fetchKafkaConnectors';

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
  if (existingConnectors.length) {
    return;
  }

  const connectorName = `${name}_${generateUuid('hex')}`;
  const res = await fetchJson(
    `http://${process.env.KAFKA_CONNECT_HOST}:${process.env.KAFKA_CONNECT_PORT}/connectors/${connectorName}/config`,
    'PUT',
    {
      'connector.class': 'io.debezium.connector.postgresql.PostgresConnector',
      'tasks.max': '1',
      'plugin.name': 'pgoutput',
      'database.hostname': process.env.INTERNAL_DOCKER_HOST,
      'database.port': process.env.PG_BT_PORT,
      'database.user': process.env.PG_BT_USER,
      'database.password': process.env.PG_BT_PASS,
      'database.dbname': process.env.PG_BT_DB,
      'database.server.name': process.env.PG_BT_DB,
      'table.include.list': Models.map(
        model => `${process.env.PG_BT_SCHEMA}.${model.tableName}`,
      ).join(','),
      'publication.name': pubName,
      'slot.name': slotName,
      'snapshot.mode': 'initial',
      'topic.creation.enable': true,
      'topic.creation.default.replication.factor': -1,
      'topic.creation.default.partitions': -1,
      'key.converter': 'io.confluent.connect.avro.AvroConverter',
      'key.converter.schema.registry.url': `http://schema-registry:${process.env.SCHEMA_REGISTRY_PORT}`,
      'value.converter': 'io.confluent.connect.avro.AvroConverter',
      'value.converter.schema.registry.url': `http://schema-registry:${process.env.SCHEMA_REGISTRY_PORT}`,
      'value.converter.schemas.enable': false,
      'transforms.ByLogicalTableRouter.type': 'io.debezium.transforms.ByLogicalTableRouter',
      'transforms.ByLogicalTableRouter.topic.regex': `${process.env.PG_BT_DB}\\.${process.env.PG_BT_SCHEMA}\\.(.*)`,
      'transforms.ByLogicalTableRouter.topic.replacement': `${topicPrefix}$1`,
      // Needed for sharding apparently.
      'transforms.ByLogicalTableRouter.key.enforce.uniqueness': false,
      ...additionalConfig,
      transforms: additionalConfig.transforms ? `${additionalConfig.transforms},ByLogicalTableRouter` : 'ByLogicalTableRouter',
    },
  );
  if (res.status >= 400) {
    throw new Error(`createDBZKafkaConnector: failed to create connector: ${JSON.stringify(res.data)}`);
  }

  await retry(
    async () => {
      const connector = await fetchJson(`http://${process.env.KAFKA_CONNECT_HOST}:${process.env.KAFKA_CONNECT_PORT}/connectors/${connectorName}`);
      return connector.status < 400;
    },
    {
      times: 10,
      interval: 1000,
      timeoutErr: 'createDBZKafkaConnector: connector not ready.',
    },
  );

  let lastMissingTopic = '';
  await retry(
    async () => {
      const { stdout } = await promisify(childProcess.exec)(
        `docker exec broker kafka-topics --bootstrap-server broker:${process.env.KAFKA_BROKER_INTERNAL_PORT} --list`,
      );
      const topics = stdout.trim().split('\n').filter(topic => topic.startsWith(topicPrefix));
      for (const Model of Models) {
        if (!topics.some(t => t.startsWith(`${topicPrefix}${Model.tableName}`))) {
          // If there aren't rows, DBZ doesn't create the topic.
          lastMissingTopic = Model.tableName;
          return false;
        }
      }
      return true;
    },
    {
      times: 10,
      interval: 1000,
      timeoutErr: `createDBZKafkaConnector: missing topic "${lastMissingTopic}".`,
    },
  );
}

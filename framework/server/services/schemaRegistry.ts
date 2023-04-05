import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import { SCHEMA_REGISTRY_HOST, SCHEMA_REGISTRY_PORT } from 'consts/infra';

export default new SchemaRegistry({
  host: `http://${SCHEMA_REGISTRY_HOST}:${SCHEMA_REGISTRY_PORT}`,
});

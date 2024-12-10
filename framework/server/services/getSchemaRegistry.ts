import { SCHEMA_REGISTRY_HOST, SCHEMA_REGISTRY_PORT } from 'consts/mz';

export default async function getSchemaRegistry() {
  const { SchemaRegistry } = await import('@kafkajs/confluent-schema-registry');

  return new SchemaRegistry({
    host: `http://${SCHEMA_REGISTRY_HOST}:${SCHEMA_REGISTRY_PORT}`,
  });
}

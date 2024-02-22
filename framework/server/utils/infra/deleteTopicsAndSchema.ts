import deleteKafkaTopics from 'utils/infra/deleteKafkaTopics';
import deleteSchemaRegistry from 'utils/infra/deleteSchemaRegistry';

export default async function deleteTopicsAndSchema(prefix: string) {
  printDebug(`Deleting Kafka topics and Schema Registry for "${prefix}"`, 'highlight');
  await Promise.all([
    withErrCtx(
      deleteKafkaTopics(prefix),
      'deleteTopicsAndSchema: deleteKafkaTopics',
    ),
    withErrCtx(
      deleteSchemaRegistry(new RegExp(`^${prefix}\\w+-(key|value)$`)),
      'deleteTopicsAndSchema: deleteSchemaRegistry',
    ),
  ]);
}

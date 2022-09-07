import knexMZ from 'services/knex/knexMZ';
import {
  DBZ_TOPIC_PREFIX,
  DBZ_TOPIC_INSERT_ONLY_PREFIX,
  MZ_TIMESTAMP_FREQUENCY,
  MV_INSERT_ONLY_SUFFIX,
} from 'consts/mz';
import MaterializedViewModels from 'services/model/allMaterializedViewModels';
import getModelRecursiveDeps from 'utils/models/getModelRecursiveDeps';

export default async function createMZDBZSource(Models: EntityClass[], insertOnly: boolean) {
  const allDeps = new Set([
    ...MaterializedViewModels.map(Model => Model.type),
    ...MaterializedViewModels.flatMap(Model => getModelRecursiveDeps(Model).map(dep => dep.type)),
  ]);

  for (const Model of Models) {
    if (!allDeps.has(Model.type)) {
      continue;
    }

    printDebug(`Creating source ${Model.tableName}${insertOnly ? MV_INSERT_ONLY_SUFFIX : ''}`, 'info');
    await knexMZ.raw(`
      CREATE SOURCE "${Model.tableName}${insertOnly ? MV_INSERT_ONLY_SUFFIX : ''}"
      FROM KAFKA BROKER 'broker:${process.env.KAFKA_BROKER_INTERNAL_PORT}'
      TOPIC '${insertOnly ? DBZ_TOPIC_INSERT_ONLY_PREFIX : DBZ_TOPIC_PREFIX}${Model.tableName}'
      WITH (
        timestamp_frequency_ms = ${MZ_TIMESTAMP_FREQUENCY}
      )
      FORMAT AVRO USING CONFLUENT SCHEMA REGISTRY 'http://schema-registry:8081'
      ENVELOPE ${insertOnly ? 'NONE' : 'DEBEZIUM'}
    `);
  }
}

import throttledPromiseAll from 'utils/throttledPromiseAll';
import knexMZ from 'services/knex/knexMZ';
import { MZ_TIMESTAMP_FREQUENCY, MZ_KAFKA_CONSUMER_PREFIX } from 'consts/mz';
import { KAFKA_BROKER_INTERNAL_PORT, SCHEMA_REGISTRY_PORT } from 'consts/infra';
import retry, { forceStopRetry } from 'utils/retry';
import showMzSystemRows from 'utils/db/showMzSystemRows';
import getEntitiesForMZSources from './getEntitiesForMZSources';

export default async function createMZSourcesFromKafka(
  models: ModelClass[],
  { topicPrefix, insertOnly }: {
    topicPrefix: string,
    insertOnly: boolean,
  },
) {
  const startTime = performance.now();

  const existingSources = new Set(await showMzSystemRows('SHOW SOURCES'));
  const allDeps = new Set(getEntitiesForMZSources('kafka') as ModelClass[]);
  const sourcesToCreate = models
    .filter(model => allDeps.has(model)
      && !existingSources.has(model.tableName));
  if (!sourcesToCreate.length) {
    printDebug('All Kafka sources already created', 'info');
    return;
  }
  printDebug(`Creating MZ sources from Kafka ${topicPrefix}`, 'highlight');

  await throttledPromiseAll(5, sourcesToCreate, async model => {
    printDebug(`Creating source for ${model.type}`, 'info');
    const startSource = performance.now();
    await retry(
      async () => {
        try {
          /*
          Note: DBZ can produce duplicate message, "UPSERT" is needed for deduping:
          https://github.com/MaterializeInc/materialize/issues/14211
          */
          await knexMZ.raw(`
            CREATE SOURCE "${model.tableName}"
            FROM KAFKA BROKER 'broker:${KAFKA_BROKER_INTERNAL_PORT}'
            TOPIC '${topicPrefix}${model.tableName}'
            WITH (
              ${process.env.PRODUCTION
                ? ''
                // docker exec $(yarn dc ps -q broker) /opt/bitnami/kafka/bin/kafka-consumer-groups.sh --list --bootstrap-server broker:29092
                : `
                  group_id_prefix = '${MZ_KAFKA_CONSUMER_PREFIX}',
                  enable_auto_commit = true,
                `}
              timestamp_frequency_ms = ${MZ_TIMESTAMP_FREQUENCY},
              fetch_message_max_bytes = 10485760
            )
            FORMAT AVRO USING CONFLUENT SCHEMA REGISTRY 'http://schema-registry:${SCHEMA_REGISTRY_PORT}'
            ENVELOPE ${insertOnly ? 'NONE' : 'DEBEZIUM UPSERT'}
          `);
        } catch (err) {
          if (err instanceof Error && err.message.includes('already exists')) {
            // pass
          } else if (err instanceof Error
            && err.message.includes('registry: subject not found')
            && performance.now() - startSource > 60 * 1000) {
            throw forceStopRetry(err);
          } else {
            throw err instanceof Error
              ? getErr(err, { ctx: `createMZSourcesFromKafka(${model.type})` })
              : err;
          }
        }
      },
      {
        timeout: 5 * 60 * 1000,
        interval: 1000,
        ctx: 'createMZSourcesFromKafka',
      },
    );
  });

  printDebug(
    `Created MZ sources from Kafka ${topicPrefix} after ${Math.round((performance.now() - startTime) / 100) / 10}s`,
    'success',
  );
}

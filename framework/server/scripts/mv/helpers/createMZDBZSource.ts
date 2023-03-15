import pLimit from 'p-limit';

import knexMZ from 'services/knex/knexMZ';
import {
  DBZ_TOPIC_UPDATEABLE_PREFIX,
  DBZ_TOPIC_INSERT_ONLY_PREFIX,
  MZ_TIMESTAMP_FREQUENCY,
} from 'consts/mz';
import { KAFKA_BROKER_INTERNAL_PORT, SCHEMA_REGISTRY_PORT } from 'consts/infra';
import retry from 'utils/retry';
import showMzSystemRows from 'utils/db/showMzSystemRows';
import getEntitiesWithMZSources from './getEntitiesWithMZSources';
import waitForMZSourcesCatchUp from '../steps/waitForMZSourcesCatchUp';

const limiter = pLimit(5);

export default async function createMZDBZSource(models: EntityClass[], insertOnly: boolean) {
  const startTime = performance.now();

  const existingSources = new Set(await showMzSystemRows('SHOW SOURCES'));
  const allDeps = new Set(getEntitiesWithMZSources());
  const sourcesToCreate = models
    .filter(model => allDeps.has(model.type)
      && !existingSources.has(model.tableName));
  if (!sourcesToCreate.length) {
    printDebug('All DBZ sources already created', 'info');
    return;
  }
  printDebug(`Creating DBZ ${insertOnly ? 'insert-only ' : ''}sources`, 'highlight');

  await Promise.all(sourcesToCreate.map(model => limiter(async () => {
    printDebug(`Creating source for ${model.type}`, 'info');
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
            TOPIC '${insertOnly ? DBZ_TOPIC_INSERT_ONLY_PREFIX : DBZ_TOPIC_UPDATEABLE_PREFIX}${model.tableName}'
            WITH (
              timestamp_frequency_ms = ${MZ_TIMESTAMP_FREQUENCY}
            )
            FORMAT AVRO USING CONFLUENT SCHEMA REGISTRY 'http://schema-registry:${SCHEMA_REGISTRY_PORT}'
            ENVELOPE ${insertOnly ? 'NONE' : 'DEBEZIUM UPSERT'}
          `);
        } catch (err) {
          if (!(err instanceof Error && err.message.includes('already exists'))) {
            throw err instanceof Error
              ? getErr(err, { ctx: `createMZDBZSource(${model.type})` })
              : err;
          }
        }
      },
      {
        timeout: 5 * 60 * 1000,
        interval: 1000,
        ctx: 'createMZDBZSource',
      },
    );
  })));

  await waitForMZSourcesCatchUp(sourcesToCreate);

  printDebug(`Created MZ ${insertOnly ? 'insert-only' : 'updateable'} sources after ${Math.round((performance.now() - startTime) / 100) / 10}s`, 'success');
}

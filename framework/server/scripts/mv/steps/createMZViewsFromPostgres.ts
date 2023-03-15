import knexMZ from 'services/knex/knexMZ';
import EntityModels from 'services/model/allEntityModels';
import { BT_PUB_UPDATEABLE, MZ_SOURCE_PG_UPDATEABLE, MZ_TIMESTAMP_FREQUENCY } from 'consts/mz';
import { INTERNAL_DOCKER_HOST, PG_BT_PORT } from 'consts/infra';

export default async function createMZViewsFromPostgres() {
  printDebug('Creating Postgres source', 'highlight');
  await knexMZ.raw(`
    CREATE MATERIALIZED SOURCE "${MZ_SOURCE_PG_UPDATEABLE}"
    FROM POSTGRES
      CONNECTION 'host=${INTERNAL_DOCKER_HOST} port=${PG_BT_PORT} user=${process.env.PG_BT_USER} password=${process.env.PG_BT_PASS} dbname=${process.env.PG_BT_DB} sslmode=require'
      PUBLICATION '${BT_PUB_UPDATEABLE}'
    WITH (
      timestamp_frequency_ms = ${MZ_TIMESTAMP_FREQUENCY}
    );
  `);

  /* for (const model of EntityModels) {
    await knexMZ.raw(`
      CREATE MATERIALIZED SOURCE "${MZ_SOURCE_PG_PREFIX}${model.tableName}"
      FROM POSTGRES
        CONNECTION 'host=${INTERNAL_DOCKER_HOST} port=${PG_BT_PORT}
        user=${process.env.PG_BT_USER} password=${process.env.PG_BT_PASS}
        dbname=${process.env.PG_BT_DB} sslmode=require'
        PUBLICATION '${BT_PUB_MODEL_PREFIX}${model.tableName.toLowerCase()}'
      WITH (
        timestamp_frequency_ms = ${MZ_TIMESTAMP_FREQUENCY}
      );
    `);
  } */

  printDebug('Creating views', 'highlight');
  await knexMZ.raw(`
    CREATE VIEWS FROM SOURCE "${MZ_SOURCE_PG_UPDATEABLE}"
    (${EntityModels.map(model => `"${model.tableName}"`).join(',')})
  `);

  /* for (const model of EntityModels) {
    await knexMZ.raw(`
      CREATE VIEWS FROM SOURCE "${MZ_SOURCE_PG_PREFIX}${model.tableName}" ("${model.tableName}")
    `);
  } */
}

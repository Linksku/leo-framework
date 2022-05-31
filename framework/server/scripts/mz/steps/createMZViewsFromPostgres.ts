import knexMZ from 'services/knex/knexMZ';
import EntityModels from 'services/model/allEntityModels';
import { BT_PUB_ALL_TABLES, MZ_SOURCE_PG_ALL_TABLES, MZ_TIMESTAMP_FREQUENCY } from 'consts/mz';

export default async function createMZViewsFromPostgres() {
  printDebug(`Creating Postgres source`, 'highlight');
  await knexMZ.raw(`
    CREATE MATERIALIZED SOURCE "${MZ_SOURCE_PG_ALL_TABLES}"
    FROM POSTGRES
      CONNECTION 'host=${process.env.INTERNAL_DOCKER_HOST} port=${process.env.PG_BT_PORT} user=${process.env.PG_BT_USER} password=${process.env.PG_BT_PASS} dbname=${process.env.PG_BT_DB} sslmode=require'
      PUBLICATION '${BT_PUB_ALL_TABLES}'
    WITH (
      timestamp_frequency_ms = ${MZ_TIMESTAMP_FREQUENCY}
    );
  `);

  /* for (const model of EntityModels) {
    await knexMZ.raw(`
      CREATE MATERIALIZED SOURCE "${MZ_SOURCE_PG_PREFIX}${model.tableName}"
      FROM POSTGRES
        CONNECTION 'host=${process.env.INTERNAL_DOCKER_HOST} port=${process.env.PG_BT_PORT}
        user=${process.env.PG_BT_USER} password=${process.env.PG_BT_PASS}
        dbname=${process.env.PG_BT_DB} sslmode=require'
        PUBLICATION '${BT_PUB_PREFIX}${model.tableName.toLowerCase()}'
      WITH (
        timestamp_frequency_ms = ${MZ_TIMESTAMP_FREQUENCY}
      );
    `);
  } */

  printDebug(`Creating views`, 'highlight');
  await knexMZ.raw(`
    CREATE VIEWS FROM SOURCE "${MZ_SOURCE_PG_ALL_TABLES}"
    (${EntityModels.map(model => `"${model.tableName}"`).join(',')})
  `);

  /* for (const model of EntityModels) {
    await knexMZ.raw(`
      CREATE VIEWS FROM SOURCE "${MZ_SOURCE_PG_PREFIX}${model.tableName}" ("${model.tableName}")
    `);
  } */
}

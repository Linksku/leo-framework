import getEntitiesWithMZSources from 'scripts/mv/helpers/getEntitiesWithMZSources';
import {
  BT_CDC_SLOT_PREFIX,
  BT_PUB_ALL_TABLES,
  MZ_SOURCE_PG,
  MZ_TIMESTAMP_FREQUENCY,
} from 'consts/mz';
import { INTERNAL_DOCKER_HOST, PG_BT_PORT } from 'consts/infra';
import showMzSystemRows from 'utils/db/showMzSystemRows';
import deleteBTReplicationSlot from 'utils/infra/deleteBTReplicationSlot';
import knexMZ from 'services/knex/knexMZ';
import knexBT from 'services/knex/knexBT';

export default async function createMZViewsFromPostgres() {
  printDebug('Creating Postgres source', 'highlight');

  const inactiveSlots = await knexBT<{ slot_name: string, active: boolean }>('pg_replication_slots')
    .select('slot_name')
    .whereLike('slot_name', `${BT_CDC_SLOT_PREFIX}%`)
    .where({ active: false });
  await Promise.all(inactiveSlots.map(
    row => deleteBTReplicationSlot(row.slot_name),
  ));

  const existingSources = new Set(await showMzSystemRows('SHOW SOURCES'));
  if (existingSources.has(MZ_SOURCE_PG)) {
    printDebug('Postgres source already created', 'info');
  } else {
    await knexMZ.raw(`
      CREATE MATERIALIZED SOURCE "${MZ_SOURCE_PG}"
      FROM POSTGRES
        CONNECTION 'host=${INTERNAL_DOCKER_HOST} port=${PG_BT_PORT} user=${process.env.PG_BT_USER} password=${process.env.PG_BT_PASS} dbname=${process.env.PG_BT_DB} sslmode=require'
        PUBLICATION '${BT_PUB_ALL_TABLES}'
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
  }

  const existingViews = new Set(await showMzSystemRows('SHOW VIEWS'));
  if (getEntitiesWithMZSources().every(type => existingViews.has(type))) {
    printDebug('Views already created', 'info');
    return;
  }

  printDebug('Creating views', 'highlight');
  await knexMZ.raw(`
    CREATE VIEWS FROM SOURCE "${MZ_SOURCE_PG}"
    (${getEntitiesWithMZSources().filter(type => !existingViews.has(type)).map(type => `"${type}"`).join(',')})
  `);

  /* for (const model of EntityModels) {
    await knexMZ.raw(`
      CREATE VIEWS FROM SOURCE "${MZ_SOURCE_PG_PREFIX}${model.tableName}" ("${model.tableName}")
    `);
  } */
}

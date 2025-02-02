import getEntitiesForMZSources from 'scripts/mv/helpers/getEntitiesForMZSources';
import {
  BT_PUB_ALL_TABLES,
  BT_PUB_UPDATEABLE,
  DBZ_FOR_UPDATEABLE,
  DBZ_FOR_INSERT_ONLY,
  MZ_SOURCE_PG,
  MZ_TIMESTAMP_FREQUENCY,
} from 'consts/mz';
import { INTERNAL_DOCKER_HOST, PG_BT_PORT, PG_BT_DB } from 'consts/infra';
import showMzSystemRows from 'utils/db/showMzSystemRows';
import knexMZ from 'services/knex/knexMZ';

export default async function createMZViewsFromPostgres() {
  if (DBZ_FOR_UPDATEABLE && DBZ_FOR_INSERT_ONLY) {
    return;
  }

  const viewsToCreate = getEntitiesForMZSources('pg');
  if (!viewsToCreate.length) {
    printDebug('No MZ views from PG needed', 'highlight');
    return;
  }

  printDebug('Creating Postgres source', 'highlight');

  /*
  Don't know if this is still needed
  Slots in use become inactive
  const inactiveSlots = await knexBT<{ slot_name: string, active: boolean }>('pg_replication_slots')
    .select('slot_name')
    .whereLike('slot_name', `${BT_CDC_SLOT_PREFIX}%`)
    .where({ active: false });
  if (inactiveSlots.length) {
    await Promise.all(inactiveSlots.map(
      row => deleteBTReplicationSlot(row.slot_name),
    ));
  }
  */

  const existingSources = new Set(await showMzSystemRows('SHOW SOURCES'));
  if (existingSources.has(MZ_SOURCE_PG)) {
    printDebug('Postgres source already created', 'info');
  } else {
    await knexMZ.raw(`
      CREATE MATERIALIZED SOURCE "${MZ_SOURCE_PG}"
      FROM POSTGRES
        CONNECTION 'host=${INTERNAL_DOCKER_HOST} port=${PG_BT_PORT} user=${process.env.PG_BT_USER} password=${process.env.PG_BT_PASS} dbname=${PG_BT_DB} sslmode=require'
        PUBLICATION '${DBZ_FOR_INSERT_ONLY ? BT_PUB_UPDATEABLE : BT_PUB_ALL_TABLES}'
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
          dbname=${PG_BT_DB} sslmode=require'
          PUBLICATION '${BT_PUB_MODEL_PREFIX}${model.tableName.toLowerCase()}'
        WITH (
          timestamp_frequency_ms = ${MZ_TIMESTAMP_FREQUENCY}
        );
      `);
    } */
  }

  const existingViews = new Set(await showMzSystemRows('SHOW VIEWS'));
  if (viewsToCreate.every(Model => existingViews.has(Model.type))) {
    printDebug('Views already created', 'info');
    return;
  }

  printDebug('Creating views from Postgres', 'highlight');
  const viewsList = viewsToCreate
    .filter(Model => !existingViews.has(Model.type))
    .map(Model => `"${Model.type}"`)
    .join(',');
  await knexMZ.raw(`
    CREATE VIEWS FROM SOURCE "${MZ_SOURCE_PG}"
    (${viewsList})
  `);
}

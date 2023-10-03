import EntityModels from 'services/model/allEntityModels';
import knexBT from 'services/knex/knexBT';
import {
  ENABLE_DBZ,
  BT_PUB_UPDATEABLE,
  BT_PUB_INSERT_ONLY,
  BT_PUB_ALL_TABLES,
} from 'consts/mz';
import fetchBTPublications from '../helpers/fetchBTPublications';

function getPublicationTables(models: EntityClass[]) {
  return models.map(model => {
    if (!model.skipColumnsForMZ.length) {
      return `"${model.tableName}"`;
    }
    const columnsForMZ = Object.keys(model.schema)
      .filter(col => !model.skipColumnsForMZ.includes(col));
    return `"${model.tableName}" (${columnsForMZ.map(col => `"${col}"`).join(',')})`;
  });
}

export default async function createBTPublications() {
  const startTime = performance.now();
  const updateableModels = EntityModels
    .filter(model => !model.useInsertOnlyPublication);
  const insertOnlyModels = EntityModels
    .filter(model => model.useInsertOnlyPublication);

  for (const model of EntityModels) {
    await knexBT.raw(`
      ALTER TABLE "${model.tableName}"
      REPLICA IDENTITY ${ENABLE_DBZ ? 'DEFAULT' : 'FULL'}
    `);
  }
  const pubnames = await fetchBTPublications();

  if (ENABLE_DBZ && updateableModels.length && !pubnames.includes(BT_PUB_UPDATEABLE)) {
    printDebug('Creating updateable tables publication', 'highlight');
    await knexBT.raw(`
      CREATE PUBLICATION "${BT_PUB_UPDATEABLE}"
      FOR TABLE ${getPublicationTables(updateableModels).join(',')}
    `);
  }

  /* for (const model of EntityModels) {
    await knexBT.raw(`
      CREATE PUBLICATION "${BT_PUB_MODEL_PREFIX}${model.tableName.toLowerCase()}"
      FOR TABLE "${model.tableName}"
    `);
  } */

  if (ENABLE_DBZ && insertOnlyModels.length && !pubnames.includes(BT_PUB_INSERT_ONLY)) {
    printDebug('Creating insert-only publication', 'highlight');
    await knexBT.raw(`
      CREATE PUBLICATION "${BT_PUB_INSERT_ONLY}"
      FOR TABLE ${getPublicationTables(insertOnlyModels).join(',')}
      WITH (
        publish = 'insert'
      )
    `);
  }

  if (EntityModels.length && !pubnames.includes(BT_PUB_ALL_TABLES)) {
    printDebug('Creating replica publication', 'highlight');
    await knexBT.raw(`
      CREATE PUBLICATION "${BT_PUB_ALL_TABLES}"
      FOR TABLE ${EntityModels.map(model => `"${model.tableName}"`).join(',')}
    `);
  }

  printDebug(
    `Created publications after ${Math.round((performance.now() - startTime) / 100) / 10}s`,
    'success',
  );
}

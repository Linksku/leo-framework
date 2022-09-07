import EntityModels from 'services/model/allEntityModels';
import knexBT from 'services/knex/knexBT';
import { BT_PUB_ALL_TABLES, BT_PUB_INSERT_ONLY } from 'consts/mz';
import fetchBTPublications from '../helpers/fetchBTPublications';

export default async function createBTPublications() {
  for (const model of EntityModels) {
    await knexBT.raw(`
      ALTER TABLE "${model.tableName}"
      REPLICA IDENTITY FULL
    `);
  }
  const pubnames = await fetchBTPublications();

  if (!pubnames.includes(BT_PUB_ALL_TABLES)) {
    printDebug('Creating all tables publication', 'highlight');
    await knexBT.raw(`
      CREATE PUBLICATION "${BT_PUB_ALL_TABLES}"
      FOR TABLE ${EntityModels.map(model => `"${model.tableName}"`).join(',')}
    `);
  }
  /* for (const model of EntityModels) {
    await knexBT.raw(`
      CREATE PUBLICATION "${BT_PUB_PREFIX}${model.tableName.toLowerCase()}"
      FOR TABLE "${model.tableName}"
    `);
  } */

  if (!pubnames.includes(BT_PUB_INSERT_ONLY)) {
    const modelsWithInsertOnly = EntityModels
      .filter(model => model.withInsertOnlyPublication);
    if (modelsWithInsertOnly.length) {
      printDebug('Creating insert-only publication', 'highlight');
      await knexBT.raw(`
        CREATE PUBLICATION "${BT_PUB_INSERT_ONLY}"
        FOR TABLE ${modelsWithInsertOnly.map(model => `"${model.tableName}"`).join(',')}
        WITH (
          publish = 'insert'
        )
      `);
    }
  }
}

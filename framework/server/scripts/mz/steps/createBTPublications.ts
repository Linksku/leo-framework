import EntityModels from 'services/model/allEntityModels';
import knexBT from 'services/knex/knexBT';
import { BT_PUB_ALL_TABLES, BT_PUB_INSERT_ONLY } from 'consts/mz';

// todo: mid/mid add script to create entity, which adds to publication
export default async function createBTPublications() {
  for (const model of EntityModels) {
    await knexBT.raw(`
      ALTER TABLE "${model.tableName}"
      REPLICA IDENTITY FULL
    `);
  }

  printDebug('Creating all tables publication', 'highlight');
  await knexBT.raw(`
    CREATE PUBLICATION "${BT_PUB_ALL_TABLES}"
    FOR TABLE ${EntityModels.map(model => `"${model.tableName}"`).join(',')}
  `);
  /* for (const model of EntityModels) {
    await knexBT.raw(`
      CREATE PUBLICATION "${BT_PUB_PREFIX}${model.tableName.toLowerCase()}"
      FOR TABLE "${model.tableName}"
    `);
  } */

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

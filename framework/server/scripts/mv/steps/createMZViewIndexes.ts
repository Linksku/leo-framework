import throttledPromiseAll from 'utils/throttledPromiseAll';
import knexMZ from 'services/knex/knexMZ';
import EntityModels from 'core/models/allEntityModels';
import MaterializedViewModels from 'core/models/allMaterializedViewModels';
import getIndexName from 'utils/db/getIndexName';

export default async function createMZViewIndexes() {
  printDebug('Creating indexes for views', 'info');

  const modelsWithIndexes = EntityModels.filter(Model => Model.mzIndexes?.length);
  await throttledPromiseAll(5, modelsWithIndexes, async Model => {
    const numDependents = MaterializedViewModels
      .filter(mv => mv.MVQueryDeps.includes(Model)).length;
    if (numDependents <= 1) {
      printDebug(`createMZViewIndexes: ${Model.type} has unnecessary mz index`);
    }

    for (const index of Model.mzIndexes) {
      try {
        await knexMZ.raw(`
          CREATE INDEX "${getIndexName(Model.tableName, index)}"
          ON "${Model.tableName}"
            (${
              Array.isArray(index)
                ? index.map(col => `"${col}"`).join(', ')
                : `"${index}"`
            })
          `);
      } catch (err) {
        if (!(err instanceof Error)
          || !err.message.includes('already exists')) {
          throw err;
        }
      }
    }
  });
}

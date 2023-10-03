import shuffle from 'lodash/shuffle.js';
import pLimit from 'p-limit';

import knexMZ from 'services/knex/knexMZ';
import EntityModels from 'services/model/allEntityModels';
import MaterializedViewModels from 'services/model/allMaterializedViewModels';
import InputMaterializedView from 'services/model/InputMaterializedView';
import showMzSystemRows from 'utils/db/showMzSystemRows';
import getIndexName from 'utils/db/getIndexName';
import shallowEqual from 'utils/shallowEqual';
import verifyCreatedTables from '../helpers/verifyCreatedTables';

// To see actual time per model, change this to 1.
const limiter = pLimit(5);

function validateQuery(query: QueryBuilder<Model>, model: ModelClass) {
  const statements: {
    grouping: string,
    value: string | any[] | ObjectOf<any>,
    type?: string,
  }[] = (query.toKnexQuery() as any)._statements;
  const allSelects = statements
    // Only normal selects and aggregate selects
    .filter(s => s.grouping === 'columns' && (Object.keys(s).length === 2 || s.type === 'aggregate'))
    .flatMap(s => {
      if (typeof s.value === 'string') {
        return [s.value];
      }
      if (Array.isArray(s.value)) {
        return s.value;
      }
      return Object.keys(s.value);
    });
  if (!allSelects.length) {
    throw new Error(`validateQuery(${model.type}): select is required.`);
  }

  let selects: string[] = allSelects.filter(s => typeof s === 'string');
  selects = selects.map(s => {
    let matches = s.match(/^(?:\w+\.)?\w+\s+as\s+(\w+)$/i);
    if (matches) {
      return matches[1];
    }

    matches = s.match(/^\w+\.(\w+)$/i);
    if (matches) {
      return matches[1];
    }

    return s;
  });

  const invalidSelect = selects.find(s => !/^\w+$/i.test(s));
  if (invalidSelect) {
    throw new Error(`validateQuery(${model.type}): invalid column "${invalidSelect}"`);
  }

  const duplicateCol = selects.find((s, idx) => selects.indexOf(s) !== idx);
  if (duplicateCol) {
    throw new Error(`validateQuery(${model.type}): duplicate column "${duplicateCol}"`);
  }

  for (const s of selects) {
    if (!TS.hasProp(model.getSchema(), s)) {
      throw new Error(`validateQuery(${model.type}): extra column "${s}"`);
    }
  }

  if (allSelects.length !== Object.keys(model.getSchema()).length) {
    const missingProps = Object.keys(model.getSchema())
      .filter(prop => !selects.includes(prop));
    throw new Error(`validateQuery(${model.type}): missing columns ${missingProps.join(', ')}`);
  }
}

export default async function createMZMaterializedViews() {
  const startTime = performance.now();
  const existingViews = await showMzSystemRows('SHOW VIEWS');
  const mvTypes = new Set<string>(MaterializedViewModels.map(mv => mv.type));
  const allViews = new Set([
    ...EntityModels.map(model => model.tableName),
    ...existingViews.filter(view => mvTypes.has(view)),
  ]);
  if (allViews.size === MaterializedViewModels.length + EntityModels.length) {
    printDebug('All MVs already created', 'info');
    return;
  }

  printDebug('Creating MVs', 'info');
  const createdViews = new Set<ModelType>();
  while (allViews.size < MaterializedViewModels.length + EntityModels.length) {
    const startingNumCreatedViews = createdViews.size;
    await Promise.all(shuffle(MaterializedViewModels.slice())
      .filter(
        model => !allViews.has(model.tableName)
          && model.MVQueryDeps.every(dep => allViews.has(dep.tableName)),
      )
      .map(model => limiter(async () => {
        // Note: this doesn't check if the index column is correct
        const numDependents = MaterializedViewModels
          .filter(mv => mv.MVQueryDeps.includes(model)).length;
        if (!model.getReplicaTable()) {
          const isInsertOnly = TS.extends(model, InputMaterializedView)
            && model.BTClass.useInsertOnlyPublication;
          if (!numDependents) {
            printDebug(`createMZMaterializedView: ${model.type} has no replica table and no dependents`);
          } else if (isInsertOnly && model.mzIndexes?.length) {
            printDebug(`createMZMaterializedView: ${model.type} shouldn't have indexes`);
          } else if (numDependents === 1 && model.mzIndexes?.length) {
            printDebug(`createMZMaterializedView: ${model.type} has unnecessary index`);
          } else if (numDependents >= 3 && !model.mzIndexes?.length && !isInsertOnly) {
            printDebug(
              `createMZMaterializedView: ${model.type} has ${numDependents} dependents and no index`,
            );
          } else if (model.mzIndexes && model.mzIndexes.length > numDependents) {
            printDebug(`createMZMaterializedView: ${model.type} has too many indexes`);
          }
        }

        let query = model.getMVQuery();
        if (model.extendMVQuery) {
          for (const fn of model.extendMVQuery) {
            query = fn(query);
          }
        }

        validateQuery(query, model);
        try {
          await knexMZ.raw(`
            CREATE VIEW "${model.tableName}"
            AS ${query.toKnexQuery().toString()}
          `);
          if (model.getReplicaTable()) {
            await knexMZ.raw(`
              CREATE INDEX "${model.tableName}_primary_idx"
              ON "${model.tableName}"
              (${
                Array.isArray(model.primaryIndex)
                  ? model.primaryIndex.map(col => `"${col}"`).join(', ')
                  : `"${model.primaryIndex}"`
              })
            `);
          }

          if (model.getReplicaTable()
            && model.mzIndexes?.length === 1
            && shallowEqual(model.mzIndexes[0], model.primaryIndex)) {
            printDebug(`createMZMaterializedView: ${model.type} has unnecssary mzIndexes`);
          } else if (model.mzIndexes?.length) {
            for (const index of model.mzIndexes) {
              await knexMZ.raw(`
                CREATE INDEX "${getIndexName(model.tableName, index)}"
                ON "${model.tableName}"
                  (${
                    Array.isArray(index)
                      ? index.map(col => `"${col}"`).join(', ')
                      : `"${index}"`
                  })
                `);
            }
          }
        } catch (err) {
          if (err instanceof Error && err.message.includes('already exists')) {
            createdViews.add(model.type);
            allViews.add(model.tableName);
            return;
          }
          throw err instanceof Error
            ? getErr(err, { ctx: 'createMZMaterializedViews', model: model.type })
            : err;
        }

        /*
        Note: mz_materialization_frontiers requires --introspection-frequency,
          but --introspection-frequency may cause "negative accumulation" errors

        if (model.getReplicaTable() || model.mzIndexes?.length) {
          await retry(
            async () => {
              const indexName = model.mzIndexes?.length
                ? getIndexName(model.tableName, model.mzIndexes[0])
                : `${model.tableName}_primary_idx`;
              // Note: no idea why a join hangs here
              const indexId = await knexMZ.raw(`
                SELECT id
                FROM mz_indexes
                WHERE name = '${indexName}';
              `);

              if (!indexId.rows.length) {
                throw new Error('No index row');
              }

              const frontierTime = await knexMZ.raw(`
                SELECT time
                FROM mz_materialization_frontiers
                WHERE global_id = ?
                AS OF now()
              `, [indexId.rows[0].id]);

              if (!frontierTime.rows.length) {
                throw new Error('No frontiers row');
              }
              if (Date.now() - frontierTime.rows[0].time > 60 * 1000) {
                throw new Error(`Frontier for ${model.tableName} is behind`);
              }
            },
            {
              timeout: 5 * 60 * 1000,
              interval: 1000,
              ctx: 'createMZMaterializedViews',
            },
          );
        }
        */

        createdViews.add(model.type);
        allViews.add(model.tableName);
      })),
    );

    if (createdViews.size === startingNumCreatedViews) {
      throw new Error('createMZMaterializedViews: circular or unknown dependency');
    }
  }

  printDebug(
    `Created MZ materialized views after ${Math.round((performance.now() - startTime) / 100) / 10}s`,
    'success',
  );

  await verifyCreatedTables(
    'mz',
    knexMZ,
    MaterializedViewModels
      .filter(model => model.getReplicaTable() && createdViews.has(model.type)),
  );
}

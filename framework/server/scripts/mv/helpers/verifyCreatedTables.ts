import type { Knex } from 'knex';
import pg from 'pg';

import retry from 'utils/retry';

export default async function verifyCreatedTables(
  dbType: 'mz' | 'rr',
  knex: Knex,
  models: ModelClass[],
) {
  printDebug('Verifying tables', 'highlight');

  const remainingModels = new Set(models);
  try {
    await retry(
      async () => {
        for (const model of remainingModels) {
          let result: pg.QueryResult<any>;
          try {
            result = await knex.raw(
              `SELECT * FROM "${model.tableName}" WHERE false${dbType === 'mz' ? ' AS OF now()' : ''}`,
            );
          } catch (err) {
            console.log(err);
            continue;
          }
          const fields = result.fields.map(f => f.name);

          for (const f of fields) {
            if (!TS.hasProp(model.getSchema(), f)) {
              throw new Error(`Extra column ${model.tableName}.${f}`);
            }
          }

          for (const prop of Object.keys(model.getSchema())) {
            if (!fields.includes(prop)) {
              throw new Error(`Missing column ${model.tableName}.${prop}`);
            }
          }

          remainingModels.delete(model);
        }

        if (remainingModels.size) {
          throw getErr(
            'Missing tables',
            { models: [...remainingModels].map(model => model.tableName) },
          );
        }
      },
      {
        timeout: 5 * 60 * 1000,
        interval: 1000,
        ctx: 'verifyCreatedTables',
      },
    );
  } catch (err) {
    throw err instanceof Error
      ? getErr(err, { ctx: `verifyCreatedTables(${dbType})` })
      : err;
  }
}

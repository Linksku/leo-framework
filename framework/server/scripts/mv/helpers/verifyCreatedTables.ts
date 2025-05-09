import type { Knex } from 'knex';
import pg from 'pg';

import { MZ_TIMESTAMP_FREQUENCY } from 'consts/mz';
import retry from 'utils/retry';
import throttledPromiseAll from 'utils/throttledPromiseAll';

export default async function verifyCreatedTables(
  dbType: 'mz' | 'rr',
  knex: Knex,
  models: ModelClass[],
) {
  printDebug(`Verifying ${dbType.toUpperCase()} tables`, 'highlight');

  const remainingModels = new Set(models);
  try {
    await retry(
      async () => {
        await throttledPromiseAll(3, [...remainingModels], async model => {
          let result: pg.QueryResult<any>;
          try {
            result = await knex.raw(`
              SELECT *
              FROM "${model.tableName}"
              WHERE false
              LIMIT 1
              ${dbType === 'mz' ? `AS OF now() + INTERVAL '${MZ_TIMESTAMP_FREQUENCY} MILLISECOND'` : ''}
            `);
          } catch (err) {
            if (!(err instanceof Error && err.message.includes('not valid for all inputs'))) {
              printDebug(err, 'warn');
            }
            return;
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
        });

        if (remainingModels.size) {
          throw getErr(
            'Missing tables',
            { models: [...remainingModels].map(model => model.tableName) },
          );
        }
      },
      {
        timeout: 5 * 60 * 1000,
        interval: 5000,
        ctx: 'verifyCreatedTables',
      },
    );
  } catch (err) {
    throw err instanceof Error
      ? getErr(err, { ctx: `verifyCreatedTables(${dbType})` })
      : err;
  }
}

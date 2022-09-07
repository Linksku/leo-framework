import type { Knex } from 'knex';
import type { ClientConfig } from 'pg';
import pg from 'pg';

export default async function verifyCreatedTables(
  pgConfig: ClientConfig,
  knex: Knex,
  models: ModelClass[],
) {
  printDebug('Verifying tables', 'highlight');
  const client = new pg.Client(pgConfig);
  await client.connect();

  const remainingModels = new Set(models);
  for (let i = 0; i < 30; i++) {
    for (const model of remainingModels) {
      let result: pg.QueryResult<any>;
      try {
        result = await client.query(
          knex(model.tableName).select('*').whereRaw('false').toString(),
        );
      } catch {
        continue;
      }
      const fields = result.fields.map(f => f.name);

      for (const f of fields) {
        if (!TS.hasProp(model.getSchema(), f)) {
          throw new Error(`verifyCreatedTables: extra column ${model.tableName}.${f}`);
        }
      }

      for (const prop of Object.keys(model.getSchema())) {
        if (!fields.includes(prop)) {
          throw new Error(`verifyCreatedTables: missing column ${model.tableName}.${prop}`);
        }
      }

      remainingModels.delete(model);
    }

    if (!remainingModels.size) {
      return;
    }
    await pause(1000);
  }

  for (const model of remainingModels) {
    printDebug(`Failed to access ${model.tableName}`, 'error');
  }
  throw new Error('Failed to access some tables.');
}

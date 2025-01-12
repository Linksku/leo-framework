import { Knex } from 'knex';

import { DBZ_FOR_INSERT_ONLY, DBZ_FOR_UPDATEABLE } from 'consts/mz';
import knexBT from 'services/knex/knexBT';
import knexRR from 'services/knex/knexRR';

export default async function createTable({ isMV, table, cb }: {
  isMV: boolean,
  table: string,
  cb: (builder: Knex.CreateTableBuilder) => void,
}) {
  try {
    if (!isMV && !(await knexBT.schema.hasTable(table))) {
      await knexBT.schema.createTable(table, cb);
    }
    if (!(await knexRR.schema.hasTable(table))) {
      await knexRR.schema.createTable(table, cb);
    }

    if (!isMV) {
      const Model = getModelClass<EntityType>(table as EntityType);
      if (!Model) {
        throw new Error(`Model not found: ${table}`);
      }

      const usesDbz = Model.useInsertOnlyPublication
        ? DBZ_FOR_INSERT_ONLY
        : DBZ_FOR_UPDATEABLE;
      await knexBT.raw(`
        ALTER TABLE ??
        REPLICA IDENTITY ${usesDbz ? 'DEFAULT' : 'FULL'}
      `, [table]);
    }
  } catch (err) {
    throw getErr(err, { ctx: 'createTable', table });
  }
}

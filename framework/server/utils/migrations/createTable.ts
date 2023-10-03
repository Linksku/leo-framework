import { Knex } from 'knex';

import { ENABLE_DBZ } from 'consts/mz';
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
      await knexBT.raw(`
        ALTER TABLE ??
        REPLICA IDENTITY ${ENABLE_DBZ ? 'DEFAULT' : 'FULL'}
      `, [table]);
    }
  } catch (err) {
    throw getErr(err, { ctx: 'createTable', table });
  }
}

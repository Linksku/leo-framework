import { Knex } from 'knex';

import knexBT from 'services/knex/knexBT';
import knexRR from 'services/knex/knexRR';

export default async function alterTable({ isMV, table, cb }: {
  isMV: boolean,
  table: string,
  cb: (builder: Knex.CreateTableBuilder) => void,
}) {
  try {
    if (!isMV) {
      await knexBT.schema.alterTable(table, cb);
    }
    await knexRR.schema.alterTable(table, cb);
  } catch (err) {
    throw getErr(err, { ctx: 'alterTable', table });
  }
}

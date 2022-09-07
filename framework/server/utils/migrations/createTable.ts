import { Knex } from 'knex';

import knexBT from 'services/knex/knexBT';
import knexRR from 'services/knex/knexRR';

export default async function createTable({ isMV, table, cb }: {
  isMV: boolean,
  table: string,
  cb: (builder: Knex.CreateTableBuilder) => void,
}) {
  if (!isMV && !(await knexBT.schema.hasTable(table))) {
    await knexBT.schema.createTable(table, cb);
  }
  if (!(await knexRR.schema.hasTable(table))) {
    await knexRR.schema.createTable(table, cb);
  }
}

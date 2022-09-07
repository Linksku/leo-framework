import knexBT from 'services/knex/knexBT';
import knexRR from 'services/knex/knexRR';

export default async function dropTable({ isMV, table }: {
  isMV: boolean,
  table: string,
}) {
  if (!isMV) {
    await knexBT.raw('DROP TABLE IF EXISTS ?? CASCADE', [table]);
  }
  await knexRR.raw('DROP TABLE IF EXISTS ?? CASCADE', [table]);
}

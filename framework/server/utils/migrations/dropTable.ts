import knexBT from 'services/knex/knexBT';
import knexRR from 'services/knex/knexRR';

export default async function dropTable({ isMV, onlyBT, table }: {
  isMV?: boolean,
  onlyBT?: boolean,
  table: string,
}) {
  try {
    if (!isMV) {
      await knexBT.raw('DROP TABLE IF EXISTS ?? CASCADE', [table]);
    }
    if (!onlyBT) {
      await knexRR.raw('DROP TABLE IF EXISTS ?? CASCADE', [table]);
    }
  } catch (err) {
    throw getErr(err, { ctx: 'dropTable', table });
  }
}

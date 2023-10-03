import knexBT from 'services/knex/knexBT';
import knexRR from 'services/knex/knexRR';

export default async function dropColumn({ isMV, table, col }: {
  isMV: boolean,
  table: string,
  col: string,
}) {
  try {
    if (!isMV && await knexBT.schema.hasColumn(table, col)) {
      await knexBT.raw(
        'ALTER TABLE ?? DROP COLUMN ?? CASCADE',
        [table, col],
      );
    }

    if (await knexRR.schema.hasColumn(table, col)) {
      await knexRR.raw(
        'ALTER TABLE ?? DROP COLUMN ?? CASCADE',
        [table, col],
      );
    }
  } catch (err) {
    throw getErr(err, { ctx: 'dropColumn', table, col });
  }
}

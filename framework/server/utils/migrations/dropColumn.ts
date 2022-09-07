import knexBT from 'services/knex/knexBT';
import knexRR from 'services/knex/knexRR';

export default async function dropColumn({ isMV, table, col }: {
  isMV: boolean,
  table: string,
  col: string,
}) {
  if (!isMV && await knexBT.schema.hasColumn(table, col)) {
    await knexBT.schema.alterTable(table, builder => {
      builder.dropColumn(col);
    });
  }

  if (await knexRR.schema.hasColumn(table, col)) {
    await knexRR.schema.alterTable(table, builder => {
      builder.dropColumn(col);
    });
  }
}

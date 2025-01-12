import knexBT from 'services/knex/knexBT';
import knexRR from 'services/knex/knexRR';
import validateTableCols from './validateTableCols';

export default async function renameColumn({
  isMV,
  table,
  oldCol,
  newCol,
  skipValidation,
}: {
  isMV: boolean,
  table: string,
  oldCol: string,
  newCol: string,
  skipValidation?: boolean,
}) {
  if (!skipValidation) {
    validateTableCols({ table, col: newCol });
  }

  try {
    if (!isMV) {
      if (await knexBT.schema.hasColumn(table, newCol)) {
        if (await knexBT.schema.hasColumn(table, oldCol)) {
          await knexBT.schema.alterTable(table, builder => {
            builder.dropColumn(oldCol);
          });
        }
      } else {
        await knexBT.schema.alterTable(table, builder => {
          builder.renameColumn(oldCol, newCol);
        });
      }
    }

    if (await knexRR.schema.hasColumn(table, newCol)) {
      if (await knexRR.schema.hasColumn(table, oldCol)) {
        await knexRR.schema.alterTable(table, builder => {
          builder.dropColumn(oldCol);
        });
      }
    } else {
      await knexRR.schema.alterTable(table, builder => {
        builder.renameColumn(oldCol, newCol);
      });
    }
  } catch (err) {
    throw getErr(err, { ctx: 'renameColumn', table, newCol });
  }
}

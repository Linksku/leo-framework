import knexBT from 'services/knex/knexBT';
import knexRR from 'services/knex/knexRR';
import getIndexName from 'utils/db/getIndexName';
import validateTableCols from './validateTableCols';

export default async function renameIndex(oldName: string, {
  isMV,
  name,
  table,
  cols,
  col,
}: {
  isMV?: boolean,
  name?: string,
  table: string,
  col?: string,
  cols?: string[],
}) {
  if (table) {
    validateTableCols({ table, col, cols });
  }

  if (!name) {
    cols = cols ?? [TS.defined(col)];
    name = getIndexName(TS.defined(table), cols);
  }

  try {
    if (!isMV) {
      await knexBT.raw('ALTER INDEX IF EXISTS ?? RENAME TO ??', [oldName, name]);
    }
    await knexRR.raw('ALTER INDEX IF EXISTS ?? RENAME TO ??', [oldName, name]);
  } catch (err) {
    throw getErr(err, { ctx: 'renameIndex', cols });
  }
}

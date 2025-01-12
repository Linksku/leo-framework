import knexBT from 'services/knex/knexBT';
import knexRR from 'services/knex/knexRR';
import getIndexName from 'utils/db/getIndexName';
import validateTableCols from './validateTableCols';

export default async function renameConstraint(oldName: string, {
  isMV,
  name,
  table,
  cols,
  col,
  skipValidation,
}: {
  isMV?: boolean,
  name?: string,
  table: string,
  col?: string,
  cols?: string[],
  skipValidation?: boolean,
}) {
  if (!skipValidation) {
    validateTableCols({ table, col, cols });
  }

  if (!name) {
    cols = cols ?? [TS.defined(col)];
    name = getIndexName(TS.defined(table), cols, true);
  }

  try {
    if (!isMV) {
      await knexBT.raw(
        'ALTER TABLE ?? RENAME CONSTRAINT ?? TO ??',
        [table, oldName, name],
      );
    } else {
      await knexRR.raw(
        'ALTER TABLE ?? RENAME CONSTRAINT ?? TO ??',
        [table, oldName, name],
      );
    }
  } catch (err) {
    if (!(err instanceof Error) || !err.message.includes('does not exist')) {
      throw getErr(err, { ctx: 'renameConstraint', cols });
    }
  }
}

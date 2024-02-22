import knexBT from 'services/knex/knexBT';
import knexRR from 'services/knex/knexRR';
import getIndexName from 'utils/db/getIndexName';

export default async function renameForeignKey(oldName: string, {
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
    throw getErr(err, { ctx: 'renameForeignKey', cols });
  }
}

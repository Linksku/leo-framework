import knexBT from 'services/knex/knexBT';
import knexRR from 'services/knex/knexRR';
import getIndexName from 'utils/db/getIndexName';

export default async function renameIndex(oldName: string, {
  name,
  table,
  cols,
  col,
}: {
  name?: string,
  table?: string,
  col?: string,
  cols?: string[],
}) {
  if (!name) {
    cols ??= [TS.defined(col)];
    name = getIndexName(TS.defined(table), cols);
  }

  try {
    await Promise.all([
      knexBT.raw('ALTER INDEX IF EXISTS ?? RENAME TO ??', [oldName, name]),
      knexRR.raw('ALTER INDEX IF EXISTS ?? RENAME TO ??', [oldName, name]),
    ]);
  } catch (err) {
    throw getErr(err, { ctx: 'renameIndex', cols });
  }
}

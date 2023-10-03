import knexBT from 'services/knex/knexBT';
import knexRR from 'services/knex/knexRR';
import getIndexName from 'utils/db/getIndexName';

export default async function dropIndex({
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
      knexBT.raw('DROP INDEX IF EXISTS ??', [name]),
      knexRR.raw('DROP INDEX IF EXISTS ??', [name]),
    ]);
  } catch (err) {
    throw getErr(err, { ctx: 'dropIndex', table, cols });
  }
}

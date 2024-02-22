import knexBT from 'services/knex/knexBT';
import knexRR from 'services/knex/knexRR';
import getIndexName from 'utils/db/getIndexName';

export default async function dropIndex({
  db,
  name,
  table,
  cols,
  col,
}: {
  db?: 'bt' | 'rr',
  name?: string,
  table?: string,
  col?: string,
  cols?: string[],
}) {
  if (!name) {
    cols = cols ?? [TS.defined(col)];
    name = getIndexName(TS.defined(table), cols);
  }

  try {
    await Promise.all([
      db === 'rr'
        ? null
        : knexBT.raw('DROP INDEX IF EXISTS ??', [name]),
      db === 'bt'
        ? null
        : knexRR.raw('DROP INDEX IF EXISTS ??', [name]),
    ]);
  } catch (err) {
    throw getErr(err, { ctx: 'dropIndex', table, cols });
  }
}

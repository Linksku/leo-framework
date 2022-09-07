import knexBT from 'services/knex/knexBT';
import knexRR from 'services/knex/knexRR';
import getIndexName from 'utils/db/getIndexName';

export default async function createIndex({
  primary,
  unique,
  table,
  cols: _cols,
  col,
}: {
  primary?: boolean,
  unique?: boolean,
  table: string,
  cols?: string[],
  col?: string,
}) {
  const cols = _cols ?? [TS.defined(col)];
  const name = getIndexName(table, cols);

  await (primary
    ? Promise.all([
      knexBT.raw(`
        ALTER TABLE ONLY ??
        ADD CONSTRAINT IF NOT EXISTS ??
        PRIMARY KEY ${cols.map(_ => '??').join(', ')}
      `, [table, name, ...cols]),
      knexRR.raw(`
        ALTER TABLE ONLY ??
        ADD CONSTRAINT IF NOT EXISTS ??
        PRIMARY KEY ${cols.map(_ => '??').join(', ')}
      `, [table, name, ...cols]),
    ])
    : knexRR.raw(`
      CREATE ${unique ? 'UNIQUE ' : ''}INDEX IF NOT EXISTS ??
      ON ??
      USING btree (${cols.map(_ => '??').join(', ')})
    `, [name, table, ...cols]));
}

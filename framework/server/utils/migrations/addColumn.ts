import knexBT from 'services/knex/knexBT';
import knexRR from 'services/knex/knexRR';
import pg from 'services/pg';

export default async function addColumn({
  isMV,
  table,
  col,
  type,
  nullable,
  default: defaultVal,
  dropDefault,
}: {
  isMV: boolean,
  table: string,
  col: string,
  type: string,
  nullable: boolean,
  default?: boolean | string | number | null,
  dropDefault?: boolean,
}) {
  if (!nullable && defaultVal === undefined) {
    throw new Error(`addColumn(${table}, ${col}): default is required. Use dropDefault if needed`);
  }

  const defaultEsc = defaultVal === undefined
    ? undefined
    : (typeof defaultVal === 'string' ? pg.escapeLiteral(defaultVal) : defaultVal);
  const rawStr = `ALTER TABLE ?? ADD COLUMN IF NOT EXISTS ?? ${type} ${nullable ? 'NULL' : 'NOT NULL'} ${defaultEsc !== undefined ? `DEFAULT ${defaultEsc}` : ''}`;
  const rawBindings = [table, col];

  if (!isMV) {
    await knexBT.raw(rawStr, rawBindings);
    if (dropDefault) {
      await knexBT.raw('ALTER TABLE ?? ALTER COLUMN ?? DROP DEFAULT', [table, col]);
    }
  }
  await knexRR.raw(rawStr, rawBindings);
  if (dropDefault) {
    await knexRR.raw('ALTER TABLE ?? ALTER COLUMN ?? DROP DEFAULT', [table, col]);
  }
}

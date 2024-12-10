import type { Knex } from 'knex';
import dayjs, { Dayjs } from 'dayjs';

import knexBT from 'services/knex/knexBT';
import knexRR from 'services/knex/knexRR';
import pg from 'services/pg';
import stringify from 'utils/stringify';
import { toDbDateTime } from 'utils/db/dbDate';
import validateTableCols from './validateTableCols';

export default async function addColumn({
  isMV,
  table,
  col,
  type,
  nullable,
  default: defaultVal,
  dropDefault,
  skipValidation,
}: {
  isMV: boolean,
  table: string,
  col: string,
  type: string,
  nullable: boolean,
  default?: boolean | string | number | Date | Knex.Raw | null,
  dropDefault?: boolean,
  skipValidation?: boolean,
}) {
  if (!nullable && defaultVal === undefined) {
    throw new Error(`addColumn(${table}, ${col}): default is required. Use dropDefault if needed`);
  }
  if (!skipValidation) {
    validateTableCols({ table, col });
  }

  let defaultEsc: Nullish<string | number | boolean>;
  if (typeof defaultVal === 'string') {
    defaultEsc = pg.escapeLiteral(defaultVal);
  } else if (defaultVal instanceof Date || defaultVal instanceof dayjs) {
    defaultEsc = pg.escapeLiteral(toDbDateTime(defaultVal as Date | Dayjs));
  } else if (defaultVal && typeof defaultVal === 'object') {
    defaultEsc = stringify(defaultVal);
  } else if (defaultVal !== undefined) {
    defaultEsc = defaultVal;
  }
  const rawStr = `
    ALTER TABLE ??
    ADD COLUMN IF NOT EXISTS ??
    ${type} ${nullable ? 'NULL' : 'NOT NULL'}
    ${defaultEsc !== undefined ? `DEFAULT ${defaultEsc}` : ''}
  `;
  const rawBindings = [table, col];

  try {
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
  } catch (err) {
    throw getErr(err, { ctx: 'addColumn', table, col });
  }
}

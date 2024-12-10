import type { Knex } from 'knex';
import type pg from 'pg';

import knexBT from 'services/knex/knexBT';
import knexMZ from 'services/knex/knexMZ';
import knexRR from 'services/knex/knexRR';

const knexMap = {
  bt: knexBT,
  mz: knexMZ,
  rr: knexRR,
};

type Opts = {
  timeout?: number,
};

export default function rawSelect<Row extends pg.QueryResultRow = ObjectOf<unknown>>(
  db: 'bt' | 'mz' | 'rr',
  sql: string,
  _bindings?: Knex.RawBinding[] | Opts,
  _opts?: Opts,
): Promise<pg.QueryResult<Row>> {
  if (!/\s*(select|show)\b/i.test(sql)) {
    throw new Error('rawSelect: query doesn\'t start with "select" or "show"');
  }

  const bindings = Array.isArray(_bindings) ? _bindings : undefined;
  const opts = Array.isArray(_bindings) ? _opts as Opts : _bindings;

  try {
    return knexMap[db]
      .raw(
        sql,
        bindings ?? [],
      )
      .timeout(
        opts?.timeout
          ?? (db === 'mz' ? 60 * 1000 : 10 * 1000),
      ) as Promise<pg.QueryResult<Row>>;
  } catch (err) {
    throw getErr(err, { db, sql: sql.slice(0, 100) });
  }
}

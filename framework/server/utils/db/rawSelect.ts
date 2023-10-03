import type { Knex } from 'knex';

import knexBT from 'services/knex/knexBT';
import knexMZ from 'services/knex/knexMZ';
import knexRR from 'services/knex/knexRR';

const knexMap = {
  bt: knexBT,
  mz: knexMZ,
  rr: knexRR,
};

type Opts = {
  db: 'bt' | 'mz' | 'rr',
  timeout?: number,
};

function rawSelect(
  sql: string,
  bindings: Knex.RawBinding[],
  opts: Opts,
): Promise<{ rows: ObjectOf<unknown>[] }>;

function rawSelect(
  sql: string,
  opts: Opts,
): Promise<{ rows: ObjectOf<unknown>[] }>;

function rawSelect(
  sql: string,
  _bindings: Knex.RawBinding[] | Opts,
  _opts?: Opts,
): Promise<{ rows: ObjectOf<unknown>[] }> {
  if (!/\s*select\b/i.test(sql)) {
    throw new Error('rawSelect: query doesn\'t start with "select"');
  }

  const bindings = Array.isArray(_bindings) ? _bindings : undefined;
  const opts = Array.isArray(_bindings) ? _opts as Opts : _bindings;

  try {
    return knexMap[opts.db]
      .raw(
        sql,
        bindings ?? [],
      )
      .timeout(
        opts.timeout ?? (opts.db === 'mz' ? 30 * 1000 : 10 * 1000),
      ) as Promise<{ rows: ObjectOf<unknown>[] }>;
  } catch (err) {
    throw getErr(err, { db: opts.db, sql: sql.slice(0, 100) });
  }
}

export default rawSelect;

import type { Knex } from 'knex';

import knexBT from 'services/knex/knexBT';
import knexMZ from 'services/knex/knexMZ';
import knexRR from 'services/knex/knexRR';

const knexMap = {
  bt: knexBT,
  mz: knexMZ,
  rr: knexRR,
};

export default function rawSelect(
  db: 'bt' | 'mz' | 'rr',
  sql: string,
  bindings?: Knex.RawBinding[],
) {
  if (!/\s*select\b/i.test(sql)) {
    throw new Error('rawSelect: query doesn\'t start with "select"');
  }
  return knexMap[db].raw(sql, bindings ?? []) as Promise<{ rows: ObjectOf<unknown>[] }>;
}

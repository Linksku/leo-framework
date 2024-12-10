import type { TypeId } from 'pg-types';
import type { Knex } from 'knex';
import KnexCls from 'knex';
import pg from 'pg';
import pgArray from 'postgres-array';

pg.types.setTypeParser(pg.types.builtins.DATE, str => str);

// By default, INT8 becomes string.
pg.types.setTypeParser(pg.types.builtins.INT8, str => {
  const int = Number.parseInt(str, 10);
  if (int > Number.MAX_SAFE_INTEGER || int < Number.MIN_SAFE_INTEGER) {
    throw new Error(`PG parseInt: INT8 ${str} is too large.`);
  }
  return int;
});

// INT8[]
pg.types.setTypeParser(1016 as TypeId, val => pgArray.parse(val, str => {
  const int = Number.parseInt(str, 10);
  if (int > Number.MAX_SAFE_INTEGER || int < Number.MIN_SAFE_INTEGER) {
    throw new Error(`PG parseInt: INT8 ${str} is too large.`);
  }
  return int;
}));

KnexCls.QueryBuilder.extend('joinLateral', function joinLateral(table: any) {
  // @ts-expect-error Knex is missing type
  const joinType = this._joinType as (val: string) => Knex.QueryBuilder;
  return joinType.call(this, 'lateral').join(table, raw('true'));
});

KnexCls.QueryBuilder.extend('leftJoinLateral', function leftJoinLateral(table: any) {
  // @ts-expect-error Knex is missing type
  const joinType = this._joinType as (val: string) => Knex.QueryBuilder;
  return joinType.call(this, 'left lateral').join(table, raw('true'));
});

export {};

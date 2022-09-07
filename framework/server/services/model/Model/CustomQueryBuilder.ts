import type { Page } from 'objection';
import type { Knex } from 'knex';
import { QueryBuilder as BaseQueryBuilder } from 'objection';
// @ts-ignore Objection is missing type
import { KnexOperation } from 'objection/lib/queryBuilder/operations/KnexOperation';

import randArrItem from 'utils/randArrItem';
import rand from 'utils/rand';
import formatTsquery from 'utils/db/formatTsquery';
import { AGGREGATE_FUNCTIONS } from 'consts/pg';

const AGGREGATE_FUNCTIONS_SET = new Set(AGGREGATE_FUNCTIONS);

export interface CustomQueryBuilderMethods {
  limit(val: number): this;
  coalesce(
    col: string,
    defaultVal: string | number | boolean | Knex.Raw,
    alias?: string,
  ): this;
  orderByRandom(): this;
  tsquery(
    col: string,
    query: string,
    config?: string,
  ): this;
  orTsquery(
    col: string,
    query: string,
    config?: string,
  ): this;
  withinDist(latCol: string, lngCol: string, lat: number, lng: number, dist: number): this;
  orderByDist(latCol: string, lngCol: string, lat: number, lng: number): this;
  fromValues(cols: string[], rows: ObjectOf<any>, alias: string): this;
  fromValues(col: string, rows: any[], alias: string): this;
  lateralJoin(table: Knex.Raw | BaseQueryBuilder<any>): this;
  lateralLeftJoin(table: Knex.Raw | BaseQueryBuilder<any>): this;
  tableSample(type: 'bernoulli' | 'system' | 'system_rows', arg: number): this;
}

function validateLateral(
  joinType: 'left' | 'inner',
  entityType: EntityType,
  table: Knex.Raw | BaseQueryBuilder<any>,
) {
  const lateralEntityType = TS.getAs<EntityClass>(table, '_modelClass').type;
  if (TS.hasProp(table, '_operations')) {
    const operations = TS.getAs<{ name: string, args: any[] }[]>(table, '_operations');
    for (const op of operations) {
      if (op.name !== 'where') {
        continue;
      }

      const rightVals = op.args.length === 1 && typeof op.args[0] === 'object'
        ? Object.values(op.args[0])
        : [TS.last(op.args)];
      const stringCol = rightVals.find(val => typeof val === 'string' && /^"?\w+"?\."?\w+"?$/.test(val));
      if (stringCol) {
        throw new Error(`lateralJoin(${entityType}, ${lateralEntityType}): maybe "${stringCol}" should be raw column instead of string`);
      }
    }

    const agg = operations.find(op => AGGREGATE_FUNCTIONS_SET.has(op.name));
    if (agg && joinType !== 'left') {
      throw new Error(`lateralJoin(${entityType}, ${lateralEntityType}): aggregates should use lateral left joins`);
    }
  }
}

export default class CustomQueryBuilder<M extends Model, R = M[]>
  extends BaseQueryBuilder<M, R>
  implements CustomQueryBuilderMethods {
  declare ArrayQueryBuilderType: QueryBuilder<M, M[]>;
  declare SingleQueryBuilderType: QueryBuilder<M, M>;
  declare MaybeSingleQueryBuilderType: QueryBuilder<M, M | undefined>;
  declare NumberQueryBuilderType: QueryBuilder<M, number>;
  declare PageQueryBuilderType: QueryBuilder<M, Page<M>>;

  // Materialize doesn't allow prepared value for limit.
  override limit(val: number): this {
    const limit = TS.parseIntOrNull(val);

    if (typeof limit !== 'number' || limit < 1) {
      throw new Error(`CustomQueryBuilder.limit: "${val}" isn't number.`);
    }

    // @ts-ignore Objection type is wrong
    return this.addOperation(new KnexOperation('limit'), [limit, { skipBinding: true }]);
  }

  coalesce(
    col: string,
    defaultVal: string | number | boolean | Knex.Raw,
    alias?: string,
  ): this {
    if (!alias) {
      const matches = col.match(/^"?\w+"?\."?(\w+)"?/);
      if (matches) {
        alias = matches[1];
      }
    }
    if (!process.env.PRODUCTION && col.includes(' ')) {
      throw new Error(`coalesce: invalid column "${col}"`);
    }
    return this.select(raw('coalesce(??, ?) ??', [col, defaultVal, alias ?? col]));
  }

  // Materialize doesn't support random() yet.
  orderByRandom(): this {
    // Prime that's not close to power of 2
    const m = randArrItem([
      11, 13, 19, 23, 29, 37, 41, 43, 47,
      53, 59, 61, 67, 71, 73, 79, 83, 89, 97,
    ]);
    return this.orderByRaw(`(id * ${rand(1, 10)}) % ${m}`);
  }

  tsquery(
    col: string,
    query: string,
    config = 'simple',
  ): this {
    return this.whereRaw(
      'to_tsvector(?, ??) @@ ?::tsquery',
      [config, col, formatTsquery(query)],
    );
  }

  orTsquery(
    col: string,
    query: string,
    config = 'simple',
  ): this {
    return this.orWhereRaw(
      'to_tsvector(?, ??) @@ ?::tsquery',
      [config, col, formatTsquery(query)],
    );
  }

  // Dist is meters.
  withinDist(latCol: string, lngCol: string, lat: number, lng: number, dist: number): this {
    return this.whereRaw(
      'st_dwithin(st_point(??, ??)::geography, st_point(?, ?), ?)',
      [lngCol, latCol, lng, lat, dist],
    );
  }

  // Dist is meters.
  orderByDist(latCol: string, lngCol: string, lat: number, lng: number): this {
    return this.orderByRaw(
      // Doesn't use index.
      'st_distance(st_point(??, ??)::geography, st_point(?, ?))',
      [lngCol, latCol, lng, lat],
    );
  }

  fromValues(cols: string | string[], rows: any[], alias: string): this {
    if (!rows.length) {
      return this.from(raw(
        `
          (select ${
            typeof cols === 'string'
              ? 'null ??'
              : cols.map(_ => 'null ??').join(',')
          } from generate_series(0, -1)) ??
        `,
        [
          ...(typeof cols === 'string' ? [cols] : cols),
          alias,
        ],
      ));
    }

    if (typeof cols === 'string') {
      return this.from(raw(
        `
          (values ${rows.map(_ => '(?)').join(',')})
          ??(??)
        `,
        [
          ...rows,
          alias,
          cols,
        ],
      ));
    }

    return this.from(raw(
      `
        (values ${rows.map(_ => `(${cols.map(_ => '?').join(',')})`).join(',')})
        ??(${cols.map(_ => '??')})
      `,
      [
        ...rows.flatMap(row => cols.map(col => row[col])),
        alias,
        ...cols,
      ],
    ));
  }

  // Note: useful in MZ for top per group.
  lateralJoin(table: Knex.Raw | BaseQueryBuilder<any>): this {
    validateLateral('inner', TS.getAs<EntityClass>(this, '_modelClass').type, table);

    // @ts-ignore Objection is missing type
    return this.addOperation(
      new KnexOperation('lateralJoin'),
      [table],
    );
  }

  lateralLeftJoin(table: Knex.Raw | BaseQueryBuilder<any>): this {
    validateLateral('left', TS.getAs<EntityClass>(this, '_modelClass').type, table);

    // @ts-ignore Objection is missing type
    return this.addOperation(
      new KnexOperation('lateralLeftJoin'),
      [table],
    );
  }

  // Can't use "where" with system_rows
  tableSample(type: 'bernoulli' | 'system' | 'system_rows', numRows: number): this {
    return this.from(raw(`?? tablesample ${type}(?)`, [this.modelClass().tableName, numRows]));
  }
}

import type { Page } from 'objection';
import type { Knex } from 'knex';
import { QueryBuilder as BaseQueryBuilder } from 'objection';
// @ts-ignore Objection is missing type
import { KnexOperation as _KnexOperation } from 'objection/lib/queryBuilder/operations/KnexOperation.js';
import unzip from 'lodash/unzip.js';

import formatTsquery from 'utils/db/formatTsquery';
import { AGGREGATE_FUNCTIONS } from 'consts/pg';
import isSchemaNullable from 'utils/models/isSchemaNullable';
import { MZ_TIMESTAMP_FREQUENCY } from 'consts/mz';

const KnexOperation = _KnexOperation as {
  new(name: string, opt?: any): typeof KnexOperation;
};

const AGGREGATE_FUNCTIONS_SET = new Set(AGGREGATE_FUNCTIONS);

export interface CustomQueryBuilderMethods {
  limit(val: number): this;
  coalesce(
    col: string,
    defaultVal: string | number | boolean | Knex.Raw,
    alias?: string,
  ): this;
  whereDistinctFrom(col: string, val: any): this;
  whereNotDistinctFrom(col: string, val: any): this;
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
  fromValues(
    data: {
      col: string,
      rows: any[],
      dataType: string,
    }[],
    alias: string,
  ): this;
  joinLateral(table: Knex.Raw | BaseQueryBuilder<any>): this;
  leftJoinLateral(table: Knex.Raw | BaseQueryBuilder<any>): this;
  tableSample(type: 'bernoulli' | 'system' | 'system_rows', arg: number): this;
  asOfNow(): this;
}

function validateLateral(
  joinType: 'left' | 'inner',
  modelType: ModelType,
  table: Knex.Raw | BaseQueryBuilder<any>,
) {
  const lateralModelType = TS.getAs<ModelClass>(table, '_modelClass').type;
  if (TS.hasDefinedProp(table, '_operations')) {
    const operations = TS.getAs<{ name: string, args: any[] }[]>(table, '_operations');
    for (const op of operations) {
      if (op.name !== 'where') {
        continue;
      }

      const rightVals = op.args.length === 1 && typeof op.args[0] === 'object'
        ? Object.values(op.args[0])
        : [TS.last(op.args)];
      const stringCol = rightVals.find(
        val => typeof val === 'string' && /^"?\w+"?\."?\w+"?$/.test(val),
      );
      if (stringCol) {
        throw new Error(
          `joinLateral(${modelType}, ${lateralModelType}): maybe "${stringCol}" should be raw column instead of string`,
        );
      }
    }

    const agg = operations.find(op => AGGREGATE_FUNCTIONS_SET.has(op.name));
    if (agg && joinType !== 'left') {
      throw new Error(`joinLateral(${modelType}, ${lateralModelType}): aggregates should use lateral left joins`);
    }
  }
}

const COL_REGEX = /^"?\w+"?\."?(\w+)"?/;

// Note: Materialize doesn't support random() yet
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
      throw new Error(`CustomQueryBuilder.limit: invalid value "${val}"`);
    }

    // @ts-ignore Objection is missing type
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    return this.addOperation(
      new KnexOperation('limit'),
      [limit, { skipBinding: true }],
    );
  }

  coalesce(
    col: string,
    defaultVal: string | number | boolean | Knex.Raw,
    alias?: string,
  ): this {
    if (!alias) {
      const matches = col.match(COL_REGEX);
      if (matches) {
        alias = matches[1];
      }
    }
    if (!process.env.PRODUCTION && col.includes(' ')) {
      throw new Error(`coalesce: invalid column "${col}"`);
    }
    return this.select(raw('coalesce(??, ?) ??', [col, defaultVal, alias ?? col]));
  }

  override whereNot = (...args: any[]): this => {
    if (!process.env.PRODUCTION && typeof args[0] === 'string') {
      let Model: ModelClass;
      let col = args[0];
      const parts = col.split('.');
      if (parts.length === 2) {
        Model = getModelClass(parts[0] as ModelType);
        col = parts[1];
      } else {
        Model = TS.getAs<ModelClass>(this, '_modelClass');
      }
      const schema = Model.getSchema()[col as ModelKey<ModelClass>];

      if (schema && isSchemaNullable(schema)) {
        // todo: low/mid make isDistinctFrom work differently with MZ
        printDebug(`whereNot(${Model.type}.${col}): unsafe condition, use whereDistinctFrom`, 'warn');
      }
    }
    return super
      // @ts-ignore wontfix
      .whereNot(...args);
  };

  whereDistinctFrom(col: string, val: any): this {
    return this.where(col, 'IS DISTINCT FROM', val);
  }

  whereNotDistinctFrom(col: string, val: any): this {
    return this.where(col, 'IS NOT DISTINCT FROM', val);
  }

  tsquery(
    col: string,
    query: string,
    config = 'simple',
  ): this {
    if (!process.env.PROCESS && config === 'simple' && /[A-Z]/.test(query)) {
      throw new Error(
        `tsquery(${TS.getAs<ModelClass>(this, '_modelClass').type}.${col}): simple tsquery is all lowercase`,
      );
    }

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
    if (!process.env.PROCESS && config === 'simple' && /[A-Z]/.test(query)) {
      throw new Error(
        `orTsquery(${TS.getAs<ModelClass>(this, '_modelClass').type}.${col}): simple tsquery is all lowercase`,
      );
    }

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

  fromValues(
    data: {
      col: string,
      rows: any[],
      dataType: string,
    }[],
    alias: string,
  ): this {
    if (!data.length) {
      throw new Error('CustomQueryBuilder.fromValues: missing data');
    }
    const numRows = data[0].rows.length;
    if (data.some(d => d.rows.length !== numRows)) {
      throw new Error('CustomQueryBuilder.fromValues: rows have different lengths');
    }

    if (!numRows) {
      return this.from(raw(
        `
          (select ${
            data.map(d => `null ??::${d.dataType}`).join(',')
          } from generate_series(0, -1)) ??
        `,
        [
          ...data.map(d => d.col),
          alias,
        ],
      ));
    }

    return this.from(raw(
      `
        (values ${
          Array.from(
            { length: numRows },
            (_, idx) => (idx === 0
              ? `(${data.map(d => `?::${d.dataType}`).join(',')})`
              : `(${data.map(_ => '?').join(',')})`),
          ).join(',')
        })
        ??(${data.map(_ => '??').join(', ')})
      `,
      [
        ...unzip(data.map(d => d.rows)).flat(),
        alias,
        ...data.map(d => d.col),
      ],
    ));
  }

  // Note: useful in MZ for top per group.
  // todo: low/easy warn if no alias
  joinLateral(table: Knex.Raw | BaseQueryBuilder<any>): this {
    validateLateral('inner', TS.getAs<ModelClass>(this, '_modelClass').type, table);

    // @ts-ignore Objection is missing type
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    return this.addOperation(
      new KnexOperation('joinLateral'),
      [table],
    );
  }

  leftJoinLateral(table: Knex.Raw | BaseQueryBuilder<any>): this {
    validateLateral('left', TS.getAs<ModelClass>(this, '_modelClass').type, table);

    // @ts-ignore Objection is missing type
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    return this.addOperation(
      new KnexOperation('leftJoinLateral'),
      [table],
    );
  }

  // Can't use "where" with system_rows
  // Note: system_rows isn't completely random, some rows will be returned together
  tableSample(type: 'bernoulli' | 'system' | 'system_rows', numRows: number): this {
    return this.from(raw(`?? tablesample ${type}(?)`, [this.modelClass().tableName, numRows]));
  }

  asOfNow(): this {
    // @ts-ignore Objection is missing type
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    return this.addOperation(
      new KnexOperation('offset'),
      [
        raw(`0 AS OF now() + INTERVAL '${MZ_TIMESTAMP_FREQUENCY} MILLISECOND'`),
        { skipBinding: true },
      ],
    );
  }
}

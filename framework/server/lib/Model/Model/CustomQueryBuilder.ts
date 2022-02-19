import type { Model as ObjectionModel, Page } from 'objection';
import { QueryBuilder as BaseQueryBuilder } from 'objection';
// @ts-ignore Objection type is wrong
import { KnexOperation } from 'objection/lib/queryBuilder/operations/KnexOperation';

import randArrItem from 'lib/randArrItem';
import rand from 'lib/rand';

export interface CustomQueryBuilderMethods {
  limit(val: number): this;
  coalesce(
    col: string,
    defaultVal: string | number | boolean,
  ): this;
  orderByRandom(): this;
}

export default class CustomQueryBuilder<M extends ObjectionModel, R = M[]>
  extends BaseQueryBuilder<M, R>
  implements CustomQueryBuilderMethods {
  // @ts-ignore required for Objection
  ArrayQueryBuilderType!: QueryBuilder<M, M[]>;
  // @ts-ignore required for Objection
  SingleQueryBuilderType!: QueryBuilder<M, M>;
  // @ts-ignore required for Objection
  MaybeSingleQueryBuilderType!: QueryBuilder<M, M | undefined>;
  // @ts-ignore required for Objection
  NumberQueryBuilderType!: QueryBuilder<M, number>;
  // @ts-ignore required for Objection
  PageQueryBuilderType!: QueryBuilder<M, Page<M>>;

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
    defaultVal: string | number | boolean,
  ): this {
    return this.select(raw('coalesce(??, ?) ??', [col, defaultVal, col]));
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
}

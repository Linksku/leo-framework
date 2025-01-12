import type { Knex } from 'knex';

import arrFirstDuplicate from 'utils/arrFirstDuplicate';

export type OrderByColumns = (
  {
    column: string,
    // E.g. "coalesce(col, 0)", for the cursor
    columnAsNum?: Knex.Raw,
    order: 'asc' | 'desc',
    // If order is desc, nulls is changed to last by default.
    nulls?: 'first' | 'last',
  }
)[];

export type PaginatedResponse<
  T extends Model,
  Item extends number | string | undefined = undefined,
> = {
  entities: T[],
  data: {
    items: [Item] extends [number | string]
      ? Item[]
      : (T['cls']['primaryIndex'] extends any[] ? ApiEntityId : EntityId)[],
    cursor?: string,
    hasCompleted: boolean,
  },
};

export const MAX_PER_PAGE = 20;

export const EMPTY_PAGINATION = {
  entities: [],
  data: {
    items: [],
    cursor: undefined,
    hasCompleted: true,
  },
} as PaginatedResponse<Model, any>;

export default async function paginateQuery<
  T extends Model,
  // todo: low/easy fix type for Item
  Item extends number | string | undefined = undefined,
>(
  query: QueryBuilder<T>,
  orderByColumns: OrderByColumns,
  {
    limit = MAX_PER_PAGE,
    cursor,
    getItem,
    keepCursorVals = false,
  }: {
    limit?: number,
    cursor: Nullish<string>,
    getItem?: (ent: Partial<T>) => Item,
    keepCursorVals?: boolean,
  },
): Promise<PaginatedResponse<T, Item>> {
  const Model = (query as any)._modelClass as ModelClass;
  if (!process.env.PRODUCTION) {
    if (!TS.hasDefinedProp(query, '_operations')) {
      throw new Error(`paginateQuery(${Model.tableName}): _operations field is expected on query.`);
    }
    const operations = query._operations as { name: string }[];
    if (operations.some(op => op.name === 'orderByRaw' || op.name === 'orderBy')) {
      throw new Error(`paginateQuery(${Model.tableName}): query already has orderby.`);
    }
    if (!operations.some(op => op.name === 'select' || op.name === 'distinct')) {
      throw new Error(`paginateQuery(${Model.tableName}): select is required.`);
    }
  }

  if (!limit || limit < 1 || limit > MAX_PER_PAGE) {
    limit = MAX_PER_PAGE;
  }

  if (cursor) {
    const cursorCols = cursor.split(',').map(n => Number.parseFloat(n));
    if (cursorCols.length !== orderByColumns.length
      || cursorCols.some(n => !Number.isFinite(n))) {
      throw new Error('paginateQuery: invalid cursor.');
    }

    query = query.where((builder: QueryBuilder<Model, Model[]>) => {
      builder = builder.whereRaw('0=1');
      for (let i = 0; i < orderByColumns.length; i++) {
        const { column, columnAsNum, order } = orderByColumns[i];

        builder = builder.orWhere((builder2: QueryBuilder<Model, Model[]>) => {
          for (let j = 0; j < i; j++) {
            builder2 = builder2.where(
              orderByColumns[j].columnAsNum ?? orderByColumns[j].column,
              '=',
              cursorCols[j],
            );
          }
          builder2 = builder2.where(
            columnAsNum ?? column,
            order === 'desc' ? '<' : '>',
            cursorCols[i],
          );
        });
      }
    });
  }

  for (let i = 0; i < orderByColumns.length; i++) {
    let {
      column,
      columnAsNum,
      order,
      nulls,
    } = orderByColumns[i];

    query = query
      .select({
        [`__cursorVal${i}`]: columnAsNum
          ?? (column.includes('.') ? column : `${Model.tableName}.${column}`),
      });
    if (order === 'desc' && nulls === undefined) {
      nulls = 'last';
    }
    query = nulls
      ? query.orderByRaw(`?? ${order} nulls ${nulls}`, [column])
      : query.orderBy(column, order);
  }
  query = query.limit(limit);

  const entities = await query;
  const items = entities.map(e => (getItem ? getItem(e) : e.getId()));
  if (!process.env.PRODUCTION
    && items.some(item => typeof item !== 'number' && typeof item !== 'string')) {
    throw getErr('paginateQuery: invalid item type', { items });
  }

  const lastRowCursorVals = entities.length
    ? orderByColumns.map((_, idx) => {
      const lastRow = entities.at(-1);
      // @ts-expect-error wontfix key hack
      return lastRow[`__cursorVal${idx}`] ?? null;
    })
    : null;

  if (!process.env.PRODUCTION) {
    if (lastRowCursorVals && lastRowCursorVals.some(val => typeof val !== 'number')) {
      throw getErr(
        `paginateQuery: orderBy columns (${orderByColumns.map(col => col.column).join(',')}) must all be numbers`,
        { lastRowCursorVals },
      );
    }

    if ((new Set(items)).size !== items.length) {
      throw getErr('paginateQuery: items contain duplicates.', items);
    }

    const cursorCols = entities.map(
      e => Array.from(
        { length: orderByColumns.length },
        // @ts-expect-error wontfix key hack
        (_, idx) => e[`__cursorVal${idx}`],
      ).join(','),
    );
    const firstDuplicate = arrFirstDuplicate(cursorCols);
    if (firstDuplicate !== undefined) {
      throw getErr('paginateQuery: cursor contains duplicate', { firstDuplicate });
    }
  }

  if (!keepCursorVals) {
    for (const e of entities) {
      for (let i = 0; i < orderByColumns.length; i++) {
        // @ts-expect-error wontfix key hack
        delete e[`__cursorVal${i}`];
      }
    }
  }
  return {
    entities,
    data: {
      items: items as [Item] extends [number | string]
        ? Item[]
        : (T['cls']['primaryIndex'] extends any[] ? ApiEntityId : EntityId)[],
      cursor: lastRowCursorVals
        ? lastRowCursorVals.join(',')
        : undefined,
      hasCompleted: entities.length < limit,
    },
  };
}

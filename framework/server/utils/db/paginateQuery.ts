import type { Knex } from 'knex';

import arrFirstDuplicate from 'utils/arrFirstDuplicate';
import shouldIndexDesc from './shouldIndexDesc';

export type OrderByColumns = (
  {
    column: Knex.Raw,
    // If column is something like "coalesce(col, 0)", this is just "col".
    columnWithoutTransforms: string,
    order: 'asc' | 'desc',
    // If order is desc, nulls is changed to last by default.
    nulls?: 'first' | 'last',
  }
  | {
    column: string | Knex.Raw,
    columnWithoutTransforms?: undefined,
    order: 'asc' | 'desc',
    nulls?: 'first' | 'last',
  }
)[];

export type PaginatedResponse<T extends Model> = {
  entities: T[],
  data: {
    entityIds: (Model['$modelClass']['idColumn'] extends any[] ? ApiEntityId : EntityId)[],
    cursor?: string,
    hasCompleted: boolean,
  },
};

export const MAX_PER_PAGE = 30;

export const EMPTY_PAGINATION = {
  entities: [],
  data: {
    entityIds: [],
    cursor: undefined,
    hasCompleted: true,
  },
} as PaginatedResponse<Model>;

export default async function paginateQuery<T extends QueryBuilder<Model>>(
  query: T,
  orderByColumns: OrderByColumns,
  {
    limit = MAX_PER_PAGE,
    cursor,
  }: {
    limit?: number,
    cursor: Nullish<string>,
  },
): Promise<PaginatedResponse<T['ModelType']>> {
  if (!process.env.PRODUCTION) {
    const { tableName } = (query as any)._modelClass as ModelClass;
    if (!TS.hasProp(query, '_operations')) {
      throw new Error(`paginateQuery(${tableName}): _operations field is expected on query.`);
    }
    const operations = query._operations as { name: string }[];
    if (operations.some(op => op.name === 'orderByRaw' || op.name === 'orderBy')) {
      throw new Error(`paginateQuery(${tableName}): query already has orderby.`);
    }
    if (!operations.some(op => op.name === 'select')) {
      throw new Error(`paginateQuery(${tableName}): select is required.`);
    }

    const nonDesc = orderByColumns.find(
      v => v.order !== 'desc'
        && ((v.columnWithoutTransforms && shouldIndexDesc(v.columnWithoutTransforms))
          || (typeof v.column === 'string' && shouldIndexDesc(v.column))),
    );
    if (nonDesc) {
      throw new Error(`paginateQuery(${tableName}): column ${nonDesc.columnWithoutTransforms ?? nonDesc.column} should be descending`);
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

    query = query.where(builder => {
      builder = builder.whereRaw('0=1');
      for (const [idx, { column, order }] of orderByColumns.entries()) {
        builder = builder.orWhere(builder2 => {
          for (const [idx2, { column: column2 }] of orderByColumns.slice(0, idx).entries()) {
            builder2 = builder2.where(
              column2,
              '=',
              cursorCols[idx2],
            );
          }
          builder2 = builder2.where(
            column,
            order === 'desc' ? '<' : '>',
            cursorCols[idx],
          );
        });
      }
    });
  }

  for (let [idx, { column, columnWithoutTransforms, order, nulls }] of orderByColumns.entries()) {
    query = query
      .select({
        [`__cursorKey${idx}`]: column,
      });
    if (order === 'desc' && nulls === undefined) {
      nulls = 'last';
    }
    query = nulls
      ? query.orderByRaw(`?? ${order} nulls ${nulls}`, [columnWithoutTransforms ?? column])
      : query.orderBy(columnWithoutTransforms ?? column, order);
  }
  query = query.limit(limit);

  const entities = await query;
  const entityIds = entities.map(e => e.getId() as Model['$modelClass']['idColumn'] extends any[] ? ApiEntityId : EntityId);
  const lastRowCursorVals = entities.length
    ? orderByColumns.map((_, idx) => {
      const lastRow = TS.last(entities);
      return lastRow
        // @ts-ignore key hack
        ? lastRow[`__cursorKey${idx}`] ?? null
        : null;
    })
    : null;

  if (!process.env.PRODUCTION) {
    if (lastRowCursorVals && lastRowCursorVals.some(val => typeof val !== 'number')) {
      throw new Error(`paginateQuery: orderBy columns (${orderByColumns.map(col => col.columnWithoutTransforms ?? col.column).join(',')}) must all be numbers: ${JSON.stringify(lastRowCursorVals)}`);
    }

    if ((new Set(entityIds)).size !== entityIds.length) {
      throw new Error('paginateQuery: entity IDs contain duplicates.');
    }

    const cursorCols = entities.map(
      e => Array.from({ length: orderByColumns.length }).map(
        // @ts-ignore wontfix key error
        (_, idx) => e[`__cursorKey${idx}`],
      ).join(','),
    );
    const firstDuplicate = arrFirstDuplicate(cursorCols);
    if (firstDuplicate !== undefined) {
      throw new Error(`paginateQuery: cursor contains duplicate: ${firstDuplicate}`);
    }
  }

  for (const e of entities) {
    for (let i = 0; i < orderByColumns.length; i++) {
      // @ts-ignore wontfix key error
      delete e[`__cursorKey${i}`];
    }
  }
  return {
    entities,
    data: {
      entityIds,
      cursor: lastRowCursorVals
        ? lastRowCursorVals.join(',')
        : undefined,
      hasCompleted: entities.length < limit,
    },
  };
}

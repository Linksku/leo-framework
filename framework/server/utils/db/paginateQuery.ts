import type { Knex } from 'knex';

import arrFirstDuplicate from 'utils/arrFirstDuplicate';

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
    items: (T['cls']['primaryIndex'] extends any[] ? ApiEntityId : EntityId)[],
    cursor?: string,
    hasCompleted: boolean,
  },
};

export const MAX_PER_PAGE = 30;

export const EMPTY_PAGINATION = {
  entities: [],
  data: {
    items: [],
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
    keepCursorVals = false,
  }: {
    limit?: number,
    cursor: Nullish<string>,
    keepCursorVals?: boolean,
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
      for (let i = 0; i < orderByColumns.length; i++) {
        const { column, order } = orderByColumns[i];

        builder = builder.orWhere(builder2 => {
          for (let j = 0; j < i; j++) {
            builder2 = builder2.where(
              orderByColumns[j].column,
              '=',
              cursorCols[j],
            );
          }
          builder2 = builder2.where(
            column,
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
      columnWithoutTransforms,
      order,
      nulls,
    } = orderByColumns[i];

    query = query
      .select({
        [`__cursorVal${i}`]: column,
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
  const entityIds = entities.map(
    e => e.getId() as T['ModelType']['cls']['primaryIndex'] extends any[]
      ? ApiEntityId
      : EntityId,
  );
  const lastRowCursorVals = entities.length
    ? orderByColumns.map((_, idx) => {
      const lastRow = entities[entities.length - 1];
      // @ts-ignore wontfix key hack
      return lastRow[`__cursorVal${idx}`] ?? null;
    })
    : null;

  if (!process.env.PRODUCTION) {
    if (lastRowCursorVals && lastRowCursorVals.some(val => typeof val !== 'number')) {
      throw getErr(
        `paginateQuery: orderBy columns (${orderByColumns.map(col => col.columnWithoutTransforms ?? col.column).join(',')}) must all be numbers`,
        { lastRowCursorVals },
      );
    }

    if ((new Set(entityIds)).size !== entityIds.length) {
      throw new Error('paginateQuery: entity IDs contain duplicates.');
    }

    const cursorCols = entities.map(
      e => Array.from({ length: orderByColumns.length }).map(
        // @ts-ignore wontfix key hack
        (_, idx) => e[`__cursorVal${idx}`],
      ).join(','),
    );
    const firstDuplicate = arrFirstDuplicate(cursorCols);
    if (firstDuplicate !== undefined) {
      throw new Error(`paginateQuery: cursor contains duplicate: ${firstDuplicate}`);
    }
  }

  if (!keepCursorVals) {
    for (const e of entities) {
      for (let i = 0; i < orderByColumns.length; i++) {
        // @ts-ignore wontfix key hack
        delete e[`__cursorVal${i}`];
      }
    }
  }
  return {
    entities,
    data: {
      items: entityIds,
      cursor: lastRowCursorVals
        ? lastRowCursorVals.join(',')
        : undefined,
      hasCompleted: entities.length < limit,
    },
  };
}

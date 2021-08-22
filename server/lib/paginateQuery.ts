import type { Knex } from 'knex';
import type { QueryBuilder } from 'objection';

export type ORDERBY_COLUMNS = (
  {
    column: Knex.Raw,
    // If column is something like "coalesce(col, 0)", this is just "col".
    columnWithoutTransforms: string,
    order: 'asc' | 'desc',
  }
  | {
    column: string | Knex.Raw,
    columnWithoutTransforms?: undefined,
    order: 'asc' | 'desc',
  }
)[];

const MAX_PER_PAGE = 30;

export default async function paginateQuery<T extends Entity>(
  query: QueryBuilder<T, T[]>,
  orderByColumns: ORDERBY_COLUMNS,
  {
    limit = MAX_PER_PAGE,
    cursor,
  }: {
    limit?: number,
    cursor: Nullish<string>,
  },
): Promise<{
  entities: T[],
  data: {
    entityIds: number[],
    cursor?: string,
    hasCompleted: boolean,
  },
}> {
  if (process.env.NODE_ENV !== 'production') {
    const { tableName } = (query as any)._modelClass as EntityModel;
    if (!hasOwnProperty(query, '_operations')) {
      throw new Error(`paginateQuery(${tableName}): _operations field is expected on query.`);
    }
    const operations: { name: string }[] = (query as any)._operations;
    if (operations.some(op => op.name === 'orderByRaw' || op.name === 'orderBy')) {
      throw new Error(`paginateQuery(${tableName}): query already has orderby.`);
    }
    if (!operations.some(op => op.name === 'select')) {
      throw new Error(`paginateQuery(${tableName}): select is required.`);
    }

    const lastColumn = orderByColumns[orderByColumns.length - 1]?.column;
    if (!lastColumn || typeof lastColumn !== 'string'
      || (lastColumn !== 'id' && !lastColumn.endsWith('.id'))) {
      throw new Error(`paginateQuery(${tableName}): last orderByColumns must be id.`);
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

    // eslint-disable-next-line @typescript-eslint/promise-function-async
    query = query.where(builder => {
      const firstOrderBy = orderByColumns[0];
      builder = builder.where(
        firstOrderBy.column,
        firstOrderBy.order === 'desc' ? '<' : '>',
        cursorCols[0],
      );

      for (const [idx, { column, order }] of orderByColumns.slice(1).entries()) {
        // eslint-disable-next-line @typescript-eslint/promise-function-async
        builder = builder.orWhere(builder2 => {
          builder2 = builder2.where(
            firstOrderBy.column,
            '=',
            cursorCols[0],
          );
          for (const [idx2, { column: column2 }] of orderByColumns.slice(1, idx + 1).entries()) {
            builder2 = builder2.andWhere(
              column2,
              '=',
              cursorCols[idx2 + 1],
            );
          }
          builder2 = builder2.andWhere(
            column,
            order === 'desc' ? '<' : '>',
            cursorCols[idx + 1],
          );
        });
      }
    });
  }

  for (const [idx, { column, columnWithoutTransforms, order }] of orderByColumns.entries()) {
    query = query
      .select({
        [`__cursorKey${idx}`]: column,
      })
      .orderBy(columnWithoutTransforms ?? column, order);
  }
  query = query.limit(limit);

  const entities = await query;
  const lastRowCursorVals = entities.length
    ? orderByColumns.map((_, idx) => entities[entities.length - 1][`__cursorKey${idx}`])
    : null;
  if (process.env.NODE_ENV !== 'production'
    && lastRowCursorVals
    && lastRowCursorVals.some(val => typeof val !== 'number')) {
    throw new Error(`paginateQuery: orderBy columns must all be numbers: ${JSON.stringify(lastRowCursorVals)}`);
  }
  return {
    entities,
    data: {
      entityIds: entities.map(e => e.id),
      cursor: lastRowCursorVals
        ? lastRowCursorVals.join(',')
        : undefined,
      hasCompleted: entities.length < limit,
    },
  };
}

import throttledPromiseAll from 'utils/throttledPromiseAll';
import paginateQuery, { OrderByColumns, PaginatedResponse, MAX_PER_PAGE } from './paginateQuery';

export default async function paginateMergeQueries<T extends QueryBuilder<Model>>(
  queries: T[],
  orderByColumns: OrderByColumns,
  {
    limit = MAX_PER_PAGE,
    cursor,
  }: {
    limit?: number,
    cursor: Nullish<string>,
  },
): Promise<PaginatedResponse<T['ModelType']>> {
  if (!process.env.PRODUCTION && queries.length > 100) {
    throw new Error(`paginateMergeQueries: ${queries.length} > 100 queries`);
  }

  const results = await throttledPromiseAll(
    10,
    queries,
    q => paginateQuery(
      q,
      orderByColumns,
      { limit, cursor, keepCursorVals: true },
    ),
  );

  let mergedEntities = results.flatMap(r => r.entities);
  mergedEntities.sort((a, b) => {
    for (let i = 0; i < orderByColumns.length; i++) {
      let { order, nulls } = orderByColumns[i];

      // @ts-ignore wontfix key hack
      const aVal = a[`__cursorVal${i}`];
      // @ts-ignore wontfix key hack
      const bVal = b[`__cursorVal${i}`];
      if (!nulls) {
        nulls = order === 'desc' ? 'last' : 'first';
      }

      if (aVal === bVal) {
        continue;
      }
      if (aVal === null) {
        return nulls === 'first' ? -1 : 1;
      }
      if (bVal === null) {
        return nulls === 'last' ? 1 : -1;
      }
      return order === 'desc'
        ? (aVal < bVal ? 1 : -1)
        : (aVal < bVal ? -1 : 1);
    }
    return 0;
  });
  // Remove duplicates.
  outer: for (let i = 0; i < mergedEntities.length - 1; i++) {
    for (let j = 0; j < orderByColumns.length; j++) {
      // @ts-ignore wontfix key hack
      if (mergedEntities[i][`__cursorVal${j}`] !== mergedEntities[i + 1][`__cursorVal${j}`]) {
        continue outer;
      }
    }

    mergedEntities.splice(i + 1, 1);
  }
  mergedEntities = mergedEntities.slice(0, limit);

  const lastRowCursorVals = mergedEntities.length
    ? orderByColumns.map((_, idx) => {
      const lastRow = mergedEntities.at(-1);
      // @ts-ignore wontfix key hack
      return lastRow[`__cursorVal${idx}`] ?? null;
    })
    : null;

  for (const e of mergedEntities) {
    for (let i = 0; i < orderByColumns.length; i++) {
      // @ts-ignore wontfix key hack
      delete e[`__cursorVal${i}`];
    }
  }

  return {
    entities: mergedEntities,
    data: {
      items: mergedEntities.map(
        e => e.getId() as T['ModelType']['cls']['primaryIndex'] extends any[]
          ? ApiEntityId
          : EntityId,
      ),
      cursor: lastRowCursorVals
        ? lastRowCursorVals.join(',')
        : undefined,
      hasCompleted: mergedEntities.length < limit,
    },
  };
}

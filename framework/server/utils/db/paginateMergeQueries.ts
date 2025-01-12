import throttledPromiseAll from 'utils/throttledPromiseAll';
import paginateQuery, { OrderByColumns, PaginatedResponse, MAX_PER_PAGE } from './paginateQuery';

export default async function paginateMergeQueries<
  Queries extends {
    query: QueryBuilder<Model>,
    // Assume all orderBys have the same length and order/nulls
    orderBy: OrderByColumns,
    getItem?: (ent: unknown) => ApiEntityId,
  }[],
  QB extends Queries[number]['query'],
  Item extends Queries[number]['getItem'] extends AnyFunction
    ? ReturnType<Queries[number]['getItem']>
    : undefined,
>(
  queries: Queries,
  {
    limit = MAX_PER_PAGE,
    cursor,
  }: {
    limit?: number,
    cursor: Nullish<string>,
  },
): Promise<PaginatedResponse<QB['ModelType'], Item>> {
  if (!process.env.PRODUCTION && queries.length > 100) {
    throw new Error(`paginateMergeQueries: ${queries.length} > 100 queries`);
  }

  const numOrderBys = queries[0].orderBy.length;
  if (!process.env.PRODUCTION && queries.some(q => q.orderBy.length !== numOrderBys)) {
    throw new Error('paginateMergeQueries: different number of orderBys');
  }

  const results = await throttledPromiseAll(
    10,
    queries,
    q => paginateQuery(
      q.query,
      q.orderBy,
      {
        limit,
        cursor,
        keepCursorVals: true,
        getItem: q.getItem,
      },
    ),
  );

  let mergedEntities = results.flatMap(r => r.entities);
  mergedEntities.sort((a, b) => {
    for (let i = 0; i < numOrderBys; i++) {
      let { order, nulls } = queries[0].orderBy[i];

      // @ts-expect-error wontfix key hack
      const aVal = a[`__cursorVal${i}`];
      // @ts-expect-error wontfix key hack
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
    for (let j = 0; j < numOrderBys; j++) {
      // @ts-expect-error wontfix key hack
      if (mergedEntities[i][`__cursorVal${j}`] !== mergedEntities[i + 1][`__cursorVal${j}`]) {
        continue outer;
      }
    }

    mergedEntities.splice(i + 1, 1);
  }
  mergedEntities = mergedEntities.slice(0, limit);

  const lastRowCursorVals = mergedEntities.length
    ? queries[0].orderBy.map((_, idx) => {
      const lastRow = mergedEntities.at(-1);
      // @ts-expect-error wontfix key hack
      return lastRow[`__cursorVal${idx}`] ?? null;
    })
    : null;

  for (const e of mergedEntities) {
    for (let i = 0; i < numOrderBys; i++) {
      // @ts-expect-error wontfix key hack
      delete e[`__cursorVal${i}`];
    }
  }

  return {
    entities: mergedEntities,
    data: {
      items: mergedEntities.map(
        e => e.getId(),
      ),
      cursor: lastRowCursorVals
        ? lastRowCursorVals.join(',')
        : undefined,
      hasCompleted: mergedEntities.length < limit,
    },
  } as PaginatedResponse<QB['ModelType'], Item>;
}

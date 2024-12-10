import uniq from 'lodash/uniq.js';

import paginateQuery, {
  OrderByColumns,
  PaginatedResponse,
  MAX_PER_PAGE,
  EMPTY_PAGINATION,
} from './paginateQuery';

// Note: queries don't have to return unique rows, but duplicates may cause rerenders
export default async function paginateSeqQueries<
  Queries extends {
    query: QueryBuilder<Model>,
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
    exactLimit = false,
    cursor = '0,',
  }: {
    limit?: number,
    exactLimit?: boolean,
    cursor?: string,
  },
): Promise<PaginatedResponse<QB['ModelType'], Item>> {
  if (!queries.length) {
    if (process.env.PRODUCTION) {
      return EMPTY_PAGINATION;
    }
    throw new Error('paginateSeqQueries: no queries.');
  }

  const cursorSplitIdx = cursor.indexOf(',');
  let queryIdx = cursor ? TS.parseIntOrNull(cursor.slice(0, cursorSplitIdx)) : null;
  if (queryIdx === null || !queries[queryIdx]) {
    throw new Error('paginateSeqQueries: invalid cursor.');
  }

  const initialCursor: string | undefined = cursor
    ? cursor.slice(cursorSplitIdx + 1) || undefined
    : undefined;
  let res = await paginateQuery(
    queries[queryIdx].query,
    queries[queryIdx].orderBy,
    {
      limit,
      cursor: initialCursor,
      getItem: queries[queryIdx].getItem,
    },
  );

  while (
    res.data.items.length < (exactLimit ? limit : limit / 2)
    && queryIdx < queries.length - 1
  ) {
    if (!process.env.PRODUCTION && !res.data.hasCompleted) {
      throw new Error('paginateSeqQueries: query should be completed.');
    }

    queryIdx++;
    const prevRes = res;

    // eslint-disable-next-line no-await-in-loop
    res = await paginateQuery(
      queries[queryIdx].query,
      queries[queryIdx].orderBy,
      {
        limit: limit - res.data.items.length,
        cursor: undefined,
        getItem: queries[queryIdx].getItem,
      },
    );
    res.entities.unshift(...prevRes.entities);
    res.data.items = uniq(prevRes.data.items.concat(res.data.items));
  }

  if (queryIdx < queries.length - 1 && res.data.hasCompleted) {
    res.data.cursor = `${queryIdx + 1},`;
    res.data.hasCompleted = false;
    return res as PaginatedResponse<QB['ModelType'], Item>;
  }

  if (!process.env.PRODUCTION && !res.data.hasCompleted && !res.data.cursor) {
    throw new Error('paginateSeqQueries: result is missing cursor.');
  }
  res.data.cursor = `${queryIdx},${res.data.cursor ?? ''}`;
  return res as PaginatedResponse<QB['ModelType'], Item>;
}

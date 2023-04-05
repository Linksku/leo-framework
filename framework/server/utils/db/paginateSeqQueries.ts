import uniq from 'lodash/uniq';

import paginateQuery, {
  OrderByColumns,
  PaginatedResponse,
  MAX_PER_PAGE,
  EMPTY_PAGINATION,
} from './paginateQuery';

export default async function paginateSeqQueries<
  Queries extends {
    query: QueryBuilder<Model>,
    orderBy: OrderByColumns,
  }[],
  QB extends Queries[number]['query'],
>(
  queries: Queries,
  limit: number = MAX_PER_PAGE,
  cursor = '0,',
): Promise<PaginatedResponse<QB['ModelType']>> {
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

  let curCursor: string | undefined = cursor
    ? cursor.slice(cursorSplitIdx + 1) || undefined
    : undefined;
  let res = await paginateQuery(queries[queryIdx].query, queries[queryIdx].orderBy, {
    limit,
    cursor: curCursor,
  });

  while (res.data.items.length < limit / 2 && queryIdx < queries.length - 1) {
    if (!process.env.PRODUCTION && !res.data.hasCompleted) {
      throw new Error('paginateSeqQueries: query should be completed.');
    }

    queryIdx++;
    curCursor = undefined;
    const prevRes = res;

    // eslint-disable-next-line no-await-in-loop
    res = await paginateQuery(
      queries[queryIdx].query,
      queries[queryIdx].orderBy,
      {
        limit: limit - res.data.items.length,
        cursor: curCursor,
      },
    );
    res.entities.unshift(...prevRes.entities);
    res.data.items = uniq([...prevRes.data.items, ...res.data.items]);
  }

  if (!res.data.hasCompleted) {
    if (!process.env.PRODUCTION && !res.data.cursor) {
      throw new Error('paginateSeqQueries: result is missing cursor.');
    }
    res.data.cursor = `${queryIdx},${res.data.cursor}`;
    return res;
  }

  if (queryIdx < queries.length - 1) {
    res.data.cursor = `${queryIdx + 1},`;
    res.data.hasCompleted = false;
  }
  return res;
}

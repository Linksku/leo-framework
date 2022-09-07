import uniq from 'lodash/uniq';

import paginateQuery, { OrderByColumns, PaginatedResponse, MAX_PER_PAGE } from './paginateQuery';

export default async function paginateSeqQueries<T extends QueryBuilder<Model>>(
  queries: {
    query: T,
    orderBy: OrderByColumns,
  }[],
  limit: number = MAX_PER_PAGE,
  cursor = '0,',
): Promise<PaginatedResponse<T['ModelType']>> {
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

  while (res.data.entityIds.length < limit / 2 && queryIdx < queries.length - 1) {
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
        limit: limit - res.data.entityIds.length,
        cursor: curCursor,
      },
    );
    res.entities.unshift(...prevRes.entities);
    res.data.entityIds = uniq([...prevRes.data.entityIds, ...res.data.entityIds]);
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
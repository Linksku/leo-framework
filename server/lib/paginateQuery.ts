import type { QueryBuilder } from 'objection';

const MAX_PER_PAGE = 30;

export default async function paginateQuery<T extends Entity>(
  query: QueryBuilder<T, T[]>,
  {
    limit = MAX_PER_PAGE,
    maxLimit = MAX_PER_PAGE,
    skipOrder = false,
    order = 'desc' as const,
    orderColumn = 'id',
    cursor = null as number | null,
  },
): Promise<{
  entities: T[],
  data: {
    entityIds: number[],
    cursor?: number,
    hasCompleted: boolean,
  },
}> {
  if (!limit || limit < 1 || limit > maxLimit) {
    limit = maxLimit;
  }
  const { tableName } = (query as any)._modelClass as EntityModel;
  const idColumn = `${tableName}.id`;

  if (!skipOrder) {
    // note: make order different if needed
    query = query.orderBy([
      { column: orderColumn, order },
      { column: idColumn, order },
    ]);
  }
  query = query.limit(limit);

  if (cursor) {
    const comparison = order === 'desc' ? '<' : '>';
    query = !orderColumn || orderColumn === 'id'
      ? query.where(idColumn, comparison, cursor)
      : query.joinRaw(
        `join :table: joinTable on joinTable.id = :id
          and (
            :table:.:col: ${comparison} joinTable.:col:
            or (:table:.:col: = joinTable.:col:
                and :table:.id ${comparison} joinTable.id))`,
        {
          table: tableName,
          col: orderColumn,
          id: cursor,
        },
      );
  }

  const entities = await query;
  return promiseObj({
    entities,
    data: {
      entityIds: entities.map(e => e.id),
      cursor: entities[entities.length - 1]?.id,
      hasCompleted: entities.length < limit,
    },
  });
}

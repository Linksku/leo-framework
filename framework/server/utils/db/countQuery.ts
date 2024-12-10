import modelCountsCache from 'services/cache/modelCountsCache';

type Rows = { count: number }[];

export default async function countQuery<T extends Model>(
  cacheKey: string | null,
  query: QueryBuilder<T>,
): Promise<number> {
  if (!cacheKey) {
    return query.count({ count: '*' })
      .then(rows => (rows as unknown as Rows)[0]?.count ?? 0);
  }

  return modelCountsCache.getOrSet(
    cacheKey,
    () => query.count({ count: '*' })
      .then(rows => (rows as unknown as Rows)[0]?.count ?? 0),
  );
}

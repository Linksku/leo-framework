import type { QueryBuilder } from 'objection';

export default async function countQuery<T extends Entity>(
  query: QueryBuilder<T, T[]>,
): Promise<number | null> {
  const rows = await query.count({ count: '*' });

  return (rows as unknown as { count: number }[])[0]?.count ?? null;
}

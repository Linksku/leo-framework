export default async function countQuery<T extends Model>(
  query: QueryBuilder<T>,
): Promise<number> {
  const rows = await query.count({ count: '*' });

  return (rows as unknown as { count: number }[])[0]?.count ?? 0;
}

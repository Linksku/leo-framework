import knexMZ from 'services/knex/knexMZ';

export default async function showMzSystemRows(query: string, timeout = 60 * 1000) {
  if (!query.startsWith('SHOW ')) {
    throw getErr('showMzSystemRows: invalid query', { query });
  }

  const results: unknown = await knexMZ
    .raw(query)
    .timeout(timeout);
  const rows = TS.assertType<{ name: string }[]>(
    results && typeof results === 'object' && TS.hasProp(results, 'rows') && results.rows,
    v => Array.isArray(v) && v.every(
      (row: unknown) => row && typeof row === 'object' && typeof TS.getProp(row, 'name') === 'string',
    ),
  );
  return rows.map(r => r.name);
}

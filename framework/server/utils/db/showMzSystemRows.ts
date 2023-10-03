import knexMZ from 'services/knex/knexMZ';
import retry from 'utils/retry';

export default async function showMzSystemRows(
  query: string,
  timeout = 2 * 60 * 1000,
) {
  if (!query.startsWith('SHOW ')) {
    throw getErr('showMzSystemRows: invalid query', { query });
  }

  let col: string[] = [];
  await retry(
    async () => {
      const results = await knexMZ
        .raw(query)
        .timeout(timeout);
      const rows = TS.assertType<{ name: string }[]>(
        results && typeof results === 'object' && TS.hasProp(results, 'rows') && results.rows,
        v => Array.isArray(v) && v.every(
          (row: unknown) => row && typeof row === 'object'
            && typeof TS.getProp(row, 'name') === 'string',
        ),
      );
      col = rows.map(r => r.name);
    },
    {
      timeout,
      interval: 10 * 1000,
      printInterval: timeout,
      ctx: `showMzSystemRows(${query})`,
    },
  );
  return col;
}

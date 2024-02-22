import { MZ_QUERY_TIMEOUT } from 'consts/mz';
import retry from 'utils/retry';

export default async function showSystemRows(
  sql: string,
  timeout = MZ_QUERY_TIMEOUT,
): Promise<string[]> {
  if (!sql.startsWith('SHOW ')) {
    throw getErr('showMzSystemRows: invalid query', { sql });
  }

  let col: string[] = [];
  await retry(
    async () => {
      const results = await rawSelect(
        'mz',
        sql,
        {
          timeout,
        },
      );
      const rows = TS.assertType<{ name: string }[]>(
        results.rows,
        v => Array.isArray(v) && v.every(
          row => TS.isObj(row)
            && typeof TS.getProp(row, 'name') === 'string',
        ),
      );
      col = rows.map(r => r.name);
    },
    {
      timeout,
      interval: 10 * 1000,
      printInterval: timeout,
      ctx: `showMzSystemRows(${sql})`,
    },
  );
  return col;
}

import type { Knex } from 'knex';
import unzip from 'lodash/unzip.js';

export default function toDbValues(
  data: ObjectOf<{
    rows: any[],
    dataType: string,
  }>,
  alias: string,
): Knex.Raw {
  const cols = TS.objKeys(data);
  const values = TS.objValues(data);
  if (!values.length) {
    throw new Error('toDbValues: missing data');
  }
  const numRows = values[0].rows.length;
  if (!process.env.PRODUCTION && values.some(val => val.rows.length !== numRows)) {
    throw new Error('toDbValues: rows have different lengths');
  }

  if (!numRows) {
    return raw(
      `
        (SELECT ${
          values.map(val => `null ??::${val.dataType}`).join(',')
        } FROM generate_series(0, -1)) ??
      `,
      [
        ...cols,
        alias,
      ],
    );
  }

  return raw(
    `
      (VALUES ${
        Array.from(
          { length: numRows },
          (_, idx) => (idx === 0
            ? `(${values.map(val => `?::${val.dataType}`).join(',')})`
            : `(${values.map(_ => '?').join(',')})`),
        ).join(',')
      })
      ??(${cols.map(_ => '??').join(', ')})
    `,
    [
      ...unzip(values.map(val => val.rows)).flat(),
      alias,
      ...cols,
    ],
  );
}

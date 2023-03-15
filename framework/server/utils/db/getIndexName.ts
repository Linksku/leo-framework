export default function getIndexName(table: string, _cols: string | string[]) {
  const cols = Array.isArray(_cols) ? _cols : [_cols];
  const name = `${table}_${cols.join('_')}_idx`
    .replace(/ DESC NULLS LAST/g, '');

  if (name.includes(' ')
    || name.includes('"')
    || name.includes(' DESC NULLS LAST')) {
    throw new Error(`getIndexName: invalid index name: ${name}`);
  }
  if (!process.env.PRODUCTION && name.length > 63) {
    throw new Error(`getIndexName: index name too long: ${name}`);
  }
  return name;
}

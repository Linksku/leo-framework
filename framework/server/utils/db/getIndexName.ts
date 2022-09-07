export default function getIndexName(table: string, _cols: string | string[]) {
  const cols = Array.isArray(_cols) ? _cols : [_cols];
  return `${table}_${cols.join('_')}_idx`;
}

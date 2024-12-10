function shortenCol(col: string) {
  const words = col.match(/[A-Z]?[a-z]+/g);
  if (!words || words.length <= 3) {
    return col;
  }
  return [words[0], ...words.slice(1).map(word => word[0])].join('');
}

export default function getIndexName(
  table: string,
  _cols: string | string[],
  isForeignKey = false,
) {
  const cols = Array.isArray(_cols) ? _cols : [_cols];
  let name = `${table}_${cols.join('_')}_${isForeignKey ? 'fk' : 'idx'}`;

  if (name.includes(' ')
    || name.includes('"')
    || name.includes(' DESC NULLS LAST')) {
    throw new Error(`getIndexName: invalid index name: ${name}`);
  }

  if (name.length > 63) {
    const shortCols = cols.map(c => shortenCol(c));
    name = `${table}_${shortCols.join('_')}_${isForeignKey ? 'fk' : 'idx'}`;
  }
  if (!process.env.PRODUCTION && name.length > 63) {
    throw new Error(`getIndexName: index name too long: ${name}`);
  }

  return name;
}

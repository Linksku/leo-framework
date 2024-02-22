const cache = new Map<ModelType, Map<string, boolean>>();

export default function isUniqueModelCols(
  Model: ModelClass,
  cols: string[],
): boolean {
  if (cols.length === 1) {
    return Model.getUniqueSingleColumnsSet().has(cols[0] as ModelKey<ModelClass>);
  }

  const modelCache = TS.mapValOrSetDefault(
    cache,
    Model.type,
    new Map(),
  );
  const cacheKey = cols.join(',');
  const cached = modelCache.get(cacheKey);
  if (cached != null) {
    return cached;
  }

  outer: for (const index of Model.getUniqueIndexes()) {
    if (!Array.isArray(index) || index.length > cols.length) {
      continue;
    }

    for (const col of index) {
      if (!cols.includes(col as ModelKey<ModelClass>)) {
        continue outer;
      }
    }

    modelCache.set(cacheKey, true);
    return true;
  }

  modelCache.set(cacheKey, false);
  return false;
}

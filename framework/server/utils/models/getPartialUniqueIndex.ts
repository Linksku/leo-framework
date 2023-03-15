export default function getPartialUniqueIndex<T extends ModelClass>(
  Model: T,
  partial: ModelPartial<T>,
): ModelIndex<T> | null {
  const keys = Object.keys(partial);
  if (keys.length === 1) {
    const key = keys[0] as ModelKey<T>;
    return Model.getUniqueColumnsSet().has(key)
      ? [key]
      : null;
  }

  const keysSet = new Set(keys);
  outer: for (const index of Model.getUniqueIndexes()) {
    for (const col of index) {
      if (!keysSet.has(col)) {
        continue outer;
      }
    }
    return index;
  }

  return null;
}

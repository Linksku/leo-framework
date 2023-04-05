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

  outer: for (const index of Model.getUniqueIndexes()) {
    if (index.length > keys.length) {
      continue;
    }

    for (const col of index) {
      if (!Object.prototype.hasOwnProperty.call(partial, col)) {
        continue outer;
      }
    }
    return index;
  }

  return null;
}

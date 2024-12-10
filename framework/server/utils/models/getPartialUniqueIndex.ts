export default function getPartialUniqueIndex<T extends ModelClass>(
  Model: T,
  partial: ModelPartial<T>,
): ModelIndex<T> | null {
  const keys = Object.keys(partial);
  if (keys.length === 1) {
    const key = keys[0] as ModelKey<T>;
    return Model.getUniqueSingleColumnsSet().has(key)
      ? [key]
      : null;
  }

  outer: for (const index of Model.getUniqueIndexes()) {
    if (Array.isArray(index) && index.length > keys.length) {
      continue;
    }

    if (Array.isArray(index)) {
      for (const col of index) {
        if (!Object.prototype.hasOwnProperty.call(partial, col)) {
          continue outer;
        }
      }
    } else if (!Object.prototype.hasOwnProperty.call(partial, index)) {
      continue;
    }
    return index;
  }

  return null;
}

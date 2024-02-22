export default function getPartialAllUniqueIndexes<T extends ModelClass>(
  Model: T,
  partial: ModelPartial<T>,
): ModelIndex<T>[] {
  const keys = Object.keys(partial);
  if (keys.length === 1) {
    const key = keys[0] as ModelKey<T>;
    return Model.getUniqueSingleColumnsSet().has(key)
      ? [[key]]
      : [];
  }

  const ret: ModelIndex<T>[] = [];
  outer: for (const index of Model.getUniqueIndexes()) {
    for (const col of index) {
      if (!keys.includes(col)) {
        continue outer;
      }
    }
    ret.push(index);
  }

  return ret;
}

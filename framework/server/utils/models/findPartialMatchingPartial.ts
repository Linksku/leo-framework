export default function findPartialMatchingPartial<
  T extends ModelClass,
  Row extends ModelPartial<T>
>(
  rows: Row[],
  uniqueIndex: ModelIndex<T>,
  partial: ModelPartial<T>,
): Row | null {
  if (typeof uniqueIndex === 'string') {
    for (const r of rows) {
      if (r[uniqueIndex] === partial[uniqueIndex]) {
        return r;
      }
    }
    return null;
  }

  outer: for (const r of rows) {
    for (const k of uniqueIndex) {
      if (r[k] !== partial[k]) {
        continue outer;
      }
    }
    return r;
  }
  return null;
}

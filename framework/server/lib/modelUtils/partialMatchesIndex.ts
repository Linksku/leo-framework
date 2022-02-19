export default function partialMatchesIndexes<T extends ModelClass>(
  partial: ModelPartial<T>,
  index: ModelIndex<T>,
): boolean {
  if (!Array.isArray(index)) {
    return TS.hasProp(partial, index);
  }

  for (const k of index) {
    if (!TS.hasProp(partial, k)) {
      return false;
    }
  }
  return true;
}

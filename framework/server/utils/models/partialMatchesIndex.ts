export default function partialMatchesIndexes<T extends ModelClass>(
  partial: ModelPartial<T>,
  index: ModelIndex<T>,
): boolean {
  for (const k of index) {
    if (!TS.hasProp(partial, k)) {
      return false;
    }
  }
  return true;
}

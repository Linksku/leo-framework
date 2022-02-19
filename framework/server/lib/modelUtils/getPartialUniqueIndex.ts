export default function getPartialUniqueIndex<T extends ModelClass>(
  Model: T,
  partial: ModelPartial<T>,
): ModelIndex<T> | null {
  for (const index of Model.getUniqueIndexes()) {
    if (typeof index === 'string') {
      if (TS.hasProp(partial, index)) {
        return index;
      }
    } else {
      for (let i = 0; i < index.length; i++) {
        if (!TS.hasProp(partial, index[i])) {
          break;
        }
        if (i === index.length - 1) {
          return index;
        }
      }
    }
  }

  return null;
}

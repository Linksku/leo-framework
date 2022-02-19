export default function getPartialUniqueIndexes<T extends ModelClass>(
  Model: T,
  partial: ModelPartial<T>,
): ModelIndex<T>[] {
  const ret: ModelIndex<T>[] = [];
  for (const index of Model.getUniqueIndexes()) {
    if (typeof index === 'string') {
      if (partial[index]) {
        ret.push(index);
      }
    } else {
      for (let i = 0; i < index.length; i++) {
        if (!partial[index[i]]) {
          break;
        }
        if (i === index.length - 1) {
          ret.push(index);
        }
      }
    }
  }

  return ret;
}

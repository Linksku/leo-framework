export default function getPartialAllUniqueIndexes<T extends ModelClass>(
  Model: T,
  partial: ModelPartial<T>,
): ModelIndex<T>[] {
  const ret: ModelIndex<T>[] = [];
  for (const index of Model.getUniqueIndexes()) {
    for (let i = 0; i < index.length; i++) {
      if (!partial[index[i]]) {
        break;
      }
      if (i === index.length - 1) {
        ret.push(index);
      }
    }
  }

  return ret;
}
const firstColumnSets = Object.create(null) as Partial<Record<ModelType, Set<string>>>;

export default function getIndexesFirstColumn<T extends ModelClass>(
  Model: T,
): Set<ModelKey<T>> {
  if (!firstColumnSets[Model.type]) {
    firstColumnSets[Model.type] = new Set([
      ...Model.getUniqueIndexes().map(idx => idx[0]),
      ...Model.getNormalIndexes().map(idx => idx[0]),
    ]);
  }
  return firstColumnSets[Model.type] as Set<ModelKey<T>>;
}

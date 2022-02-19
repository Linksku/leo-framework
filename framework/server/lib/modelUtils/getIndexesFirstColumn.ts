const firstColumnSets = Object.create(null) as Partial<Record<ModelType, Set<string>>>;

export default function getIndexesFirstColumn<T extends ModelClass>(
  Model: T,
): Set<ModelKey<T>> {
  if (!firstColumnSets[Model.type]) {
    firstColumnSets[Model.type] = new Set([
      ...Model.getUniqueIndexes().map(i => (typeof i === 'string' ? i : i[0])),
      ...Model.getNormalIndexes().map(i => (typeof i === 'string' ? i : i[0])),
    ]);
  }
  return firstColumnSets[Model.type] as Set<ModelKey<T>>;
}

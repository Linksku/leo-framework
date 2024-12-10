import isModelType from 'utils/models/isModelType';

export default function validateTableCols({
  table,
  cols,
  col,
}: {
  table: string,
  col?: string,
  cols?: string[],
}) {
  cols ??= [TS.defined(col)];

  if (!isModelType(table)) {
    throw new Error(`Invalid table "${table}"`);
  }
  const Model = getModelClass(table);

  for (const c of cols) {
    if (!Model.getSchema()[c as ModelKey<ModelClass>]) {
      throw new Error(`Invalid column "${col}" for table "${table}"`);
    }
  }
}

import getNonNullSchema from 'utils/models/getNonNullSchema';

export default function isColDescNullsLast(Model: ModelClass, col: string) {
  if (col === Model.primaryIndex) {
    return false;
  }

  const schema = TS.defined(Model.getSchema()[col as ModelKey<ModelClass>]);
  const { nonNullType } = getNonNullSchema(schema);
  return nonNullType === 'number'
    || nonNullType === 'integer'
    || (nonNullType && typeof nonNullType === 'object' && nonNullType.instanceof === 'Date');
}

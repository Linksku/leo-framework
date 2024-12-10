import getPartialUniqueIndex from 'utils/models/getPartialUniqueIndex';
import stringify from 'utils/stringify';
import getNonNullSchema from './getNonNullSchema';
import isSchemaNullable from './isSchemaNullable';

export default function validateUniquePartial<T extends ModelClass>(
  Model: T,
  partial: ModelPartial<T>,
): void {
  if (process.env.PRODUCTION) {
    return;
  }

  const entries = TS.objEntries(partial);
  const uniqueIndex = getPartialUniqueIndex(Model, partial);
  if (!uniqueIndex) {
    throw new Error(
      `validateUniquePartial(${Model.type}): no unique index: ${entries.map(e => e[0]).join(',')}`,
    );
  }

  const schema = Model.getSchema();
  for (const [key, val] of entries) {
    if (val === null) {
      if (!isSchemaNullable(schema[key])) {
        throw new Error(
          `validateUniquePartial: ${Model.type} ${key}=${stringify(val)} is not nullable.`,
        );
      }
    } else {
      const { nonNullType } = getNonNullSchema(schema[key]);
      if ((nonNullType === 'string' && typeof val !== 'string')
        || ((nonNullType === 'number' || nonNullType === 'integer') && typeof val !== 'number')) {
        throw new Error(
          `validateUniquePartial: ${Model.type} ${key}=${stringify(val)} (${typeof val}) doesn't match schema (${nonNullType}).`,
        );
      }
    }
  }
}

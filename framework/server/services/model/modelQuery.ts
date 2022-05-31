import type { TransactionOrKnex } from 'objection';

export default function modelQuery<T extends ModelClass>(
  Model: T,
  trxOrKnex?: TransactionOrKnex,
): QueryBuilder<ModelInstance<T>> {
  // @ts-ignore TS speed hack
  return Model.query(trxOrKnex);
}

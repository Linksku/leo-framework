import type { TransactionOrKnex } from 'objection';

// todo: mid/mid disallow writes, or switch to BT automatically
export default function modelQuery<T extends ModelClass>(
  Model: T,
  trxOrKnex?: TransactionOrKnex,
): QueryBuilder<ModelInstance<T>> {
  // @ts-ignore TS speed hack
  return Model.query(trxOrKnex);
}

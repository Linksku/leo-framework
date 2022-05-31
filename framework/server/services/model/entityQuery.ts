import type { TransactionOrKnex } from 'objection';

export default function entityQuery<T extends EntityClass>(
  Entity: T,
  trxOrKnex?: TransactionOrKnex,
): QueryBuilder<EntityInstance<T>> {
  // @ts-ignore TS speed hack
  return Entity.query(trxOrKnex);
}

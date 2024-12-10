import type { TransactionOrKnex } from 'objection';

export default function entityQuery<T extends EntityClass>(
  Entity: T,
  trxOrKnex?: TransactionOrKnex | 'bt' | 'mz' | 'rr',
): QueryBuilder<EntityInstance<T>> {
  return modelQuery(Entity, trxOrKnex);
}

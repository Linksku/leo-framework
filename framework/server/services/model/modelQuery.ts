import type { TransactionOrKnex } from 'objection';

import knexBT from 'services/knex/knexBT';
import knexMZ from 'services/knex/knexMZ';
import knexRR from 'services/knex/knexRR';

const knexMap = {
  bt: knexBT,
  mz: knexMZ,
  rr: knexRR,
};

export default function modelQuery<T extends ModelClass>(
  Model: T,
  trxOrKnex?: TransactionOrKnex | 'bt' | 'mz' | 'rr',
): QueryBuilder<ModelInstance<T>> {
  // @ts-ignore TS speed hack
  return Model.query(
    typeof trxOrKnex === 'string'
      ? knexMap[trxOrKnex]
      : trxOrKnex,
  );
}

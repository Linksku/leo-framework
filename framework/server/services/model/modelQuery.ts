import type { TransactionOrKnex } from 'objection';
import { IS_PROFILING_API } from 'consts/infra';

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
  let startTime = 0;
  // @ts-ignore TS speed hack
  let query: QueryBuilder<ModelInstance<T>> = (Model.query as AnyFunction)(
    typeof trxOrKnex === 'string'
      ? knexMap[trxOrKnex]
      : trxOrKnex,
  );

  if ((IS_PROFILING_API || !process.env.PRODUCTION) && getRC()?.path) {
    query = query
      .runBefore(res => {
        startTime = performance.now();
        return res;
      })
      .runAfter(res => {
        if (IS_PROFILING_API || performance.now() - startTime > 100) {
          // eslint-disable-next-line no-console
          console.log(`modelQuery(${Model.type}): ${Math.round(performance.now() - startTime)}ms`);
        }
        return res;
      });
  }
  return query;
}

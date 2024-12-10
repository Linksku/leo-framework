import type { Knex } from 'knex';

import knexBT from 'services/knex/knexBT';
import { updateLastWriteTime } from 'core/models/helpers/lastWriteTimeHelpers';
import RequestContextLocalStorage from 'core/requestContext/RequestContextLocalStorage';
import modelsCache from 'services/cache/modelsCache';
import modelIdsCache from 'services/cache/modelIdsCache';

export type UpdateOpts = {
  trx?: Knex.Transaction,
};

export default async function updateAll<
  T extends EntityClass,
  P extends ModelPartialExact<T, P>,
  Obj extends ModelPartialExact<T, Obj>,
>(
  this: T,
  partial: P,
  obj: Obj,
  opts?: UpdateOpts,
): Promise<EntityInstance<T>[]> {
  const updated = await entityQuery(this, opts?.trx ?? knexBT)
    .patch(obj)
    .where(partial)
    .returning('*');
  if (!process.env.PRODUCTION) {
    for (const ent of updated) {
      ent.$validate();
    }
  }

  const rc = getRC();
  if (updated.length) {
    await RequestContextLocalStorage.exit(
      () => Promise.all([
        ...updated.map(ent => modelsCache.handleUpdate(rc, this, ent)),
        ...updated.map(ent => modelIdsCache.handleUpdate(rc, this, ent)),
        updateLastWriteTime(this.type),
      ]),
    );
  }
  return updated;
}

import type { Knex } from 'knex';

import validateNotUniquePartial from 'utils/models/validateNotUniquePartial';
import knexBT from 'services/knex/knexBT';
import RequestContextLocalStorage from 'services/requestContext/RequestContextLocalStorage';
import modelsCache from 'services/cache/modelsCache';
import modelIdsCache from 'services/cache/modelIdsCache';
import { updateLastWriteTime } from 'services/model/helpers/lastWriteTimeHelpers';

export type DeleteAllOpts = {
  trx?: Knex.Transaction,
};

export default async function deleteAll<
  T extends EntityClass,
  P extends ModelPartialExact<T, P>,
>(
  this: T,
  partial: P,
  opts?: DeleteAllOpts,
): Promise<EntityInstance<T>[]> {
  if (!this.deleteable) {
    throw new Error(`${this.name}.deleteAll: not deleteable.`);
  }
  validateNotUniquePartial(this, partial);

  const deleted = await entityQuery(this, opts?.trx ?? knexBT)
    .delete()
    .where(partial)
    .returning('*');
  if (!process.env.PRODUCTION) {
    for (const ent of deleted) {
      ent.$validate();
    }
  }

  if (deleted.length) {
    const rc = getRC();
    await RequestContextLocalStorage.exit(
      () => Promise.all([
        ...deleted.map(ent => modelsCache.handleDelete(rc, this, ent)),
        ...deleted.map(ent => modelIdsCache.handleDelete(rc, this, ent)),
        updateLastWriteTime(this.type),
      ]),
    );
  }
  return deleted;
}

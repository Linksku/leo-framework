import type { Knex } from 'knex';

import knexBT from 'services/knex/knexBT';
import getPartialUniqueIndex from 'utils/models/getPartialUniqueIndex';
import RequestContextLocalStorage from 'services/requestContext/RequestContextLocalStorage';
import modelsCache from 'services/cache/modelsCache';
import modelIdsCache from 'services/cache/modelIdsCache';
import { updateLastWriteTime } from 'services/model/helpers/lastWriteTimeHelpers';

const MAX_BULK_DELETES = 100;

export type DeleteBulkOpts = {
  trx?: Knex.Transaction,
};

export default async function deleteBulk<
  T extends EntityClass,
  P extends ModelPartialExact<T, P>,
>(
  this: T,
  partials: P[],
  opts?: DeleteBulkOpts,
): Promise<EntityInstance<T>[]> {
  if (!this.deleteable) {
    throw new Error(`${this.name}.deleteBulk: not deleteable.`);
  }
  if (!partials.length) {
    return [];
  }

  const uniqueIndex = getPartialUniqueIndex(this, partials[0]);
  if (!uniqueIndex) {
    throw new Error(`${this.name}.deleteBulk: no unique index`);
  }
  if (!process.env.PRODUCTION && partials.some(partial => {
    const keys: ModelKey<T>[] = TS.objKeys(partial);
    return keys.length !== uniqueIndex.length || keys.some(k => !uniqueIndex.includes(k));
  })) {
    throw new Error(`${this.name}.deleteBulk: rows have different keys.`);
  }

  const rc = getRC();
  const allDeleted: EntityInstance<T>[] = [];
  for (let i = 0; i < partials.length; i += MAX_BULK_DELETES) {
    const slice = partials.slice(i, i + MAX_BULK_DELETES);
    let query = entityQuery(this, opts?.trx ?? knexBT)
      .delete()
      .where(slice[0]);
    for (const p of slice.slice(1)) {
      query = query.orWhere(p);
    }
    // eslint-disable-next-line no-await-in-loop
    const deleted = await query.returning('*');
    if (!deleted.length) {
      continue;
    }

    if (!process.env.PRODUCTION) {
      for (const ent of deleted) {
        ent.$validate();
      }
    }

    // eslint-disable-next-line no-await-in-loop
    await RequestContextLocalStorage.exit(() => Promise.all([
      ...deleted.map(ent => modelsCache.handleDelete(rc, this, ent)),
      ...deleted.map(ent => modelIdsCache.handleDelete(rc, this, ent)),
      updateLastWriteTime(this.type),
    ]));
    allDeleted.push(...deleted);
  }

  return allDeleted;
}

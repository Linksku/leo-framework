import type { Knex } from 'knex';

import knexBT from 'services/knex/knexBT';
import getPartialUniqueIndex from 'utils/models/getPartialUniqueIndex';
import RequestContextLocalStorage from 'core/requestContext/RequestContextLocalStorage';
import modelsCache from 'services/cache/modelsCache';
import modelIdsCache from 'services/cache/modelIdsCache';
import { updateLastWriteTime } from 'core/models/helpers/lastWriteTimeHelpers';

const MAX_BULK_DELETES = 100;

export type DeleteBulkOpts = {
  trx?: Knex.Transaction,
  force?: boolean,
};

export default async function deleteBulk<
  T extends EntityClass,
  P extends ModelPartialExact<T, P> & ModelUniquePartial<T>,
>(
  this: T,
  partials: P[],
  opts?: DeleteBulkOpts,
): Promise<EntityInstance<T>[]> {
  if (!this.deleteable && !opts?.force) {
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
      try {
        for (const ent of deleted) {
          ent.$validate();
        }
      } catch (err) {
        printDebug(err, 'error', { ctx: `${this.name}.deleteBulk` });
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

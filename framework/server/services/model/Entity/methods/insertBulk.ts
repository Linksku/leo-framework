import type { Knex } from 'knex';

import getPartialUniqueIndex from 'utils/models/getPartialUniqueIndex';
import modelsCache from 'services/cache/modelsCache';
import modelIdsCache from 'services/cache/modelIdsCache';
import knexBT from 'services/knex/knexBT';
import { updateLastWriteTime } from 'services/model/helpers/lastWriteTimeHelpers';
import RequestContextLocalStorage from 'services/requestContext/RequestContextLocalStorage';

const MAX_BULK_INSERTS = 100;

// todo: mid/mid exact types for model partial
function insertBulk<T extends EntityClass, Obj extends ModelPartialExact<T, Obj>>(
  this: T,
  objs: Obj[],
  opts?: {
    onDuplicate?: 'error' | 'update',
    trx?: Knex.Transaction,
  },
): Promise<EntityInstance<T>[]>;

function insertBulk<T extends EntityClass, Obj extends ModelPartialExact<T, Obj>>(
  this: T,
  objs: Obj[],
  opts: {
    onDuplicate: 'ignore',
    trx?: Knex.Transaction,
  },
): Promise<(EntityInstance<T> | null)[]>;

async function insertBulk<T extends EntityClass, Obj extends ModelPartialExact<T, Obj>>(
  this: T,
  objs: Obj[],
  {
    onDuplicate = 'error' as 'error' | 'update' | 'ignore',
    trx,
  }: {
    onDuplicate?: 'error' | 'update' | 'ignore',
    trx?: Knex.Transaction
  } = {},
): Promise<(EntityInstance<T> | null)[]> {
  const firstObj = objs[0];
  if (!firstObj) {
    return [];
  }

  const uniqueIndex = getPartialUniqueIndex(this, firstObj);
  if (onDuplicate !== 'error') {
    if (!uniqueIndex) {
      throw new Error(`${this.name}.insertBulk: no unique key: ${Object.keys(firstObj).join(',')}`);
    }

    const nonUniqueObj = Array.isArray(uniqueIndex)
      ? objs.find(obj => uniqueIndex.some(col => !obj[col]))
      : objs.find(obj => !obj[uniqueIndex]);
    if (nonUniqueObj) {
      throw new Error(
        `${this.name}.insertBulk: object doesn't have unique key: ${Object.keys(nonUniqueObj).join(',')}`,
      );
    }
  }

  const rc = getRC();
  let allInserted: (EntityInstance<T> | null)[] = [];
  for (let i = 0; i < objs.length; i += MAX_BULK_INSERTS) {
    const slice = objs.slice(i, i + MAX_BULK_INSERTS);

    let query = entityQuery(this, trx ?? knexBT)
      .insert(slice)
      .returning('*');
    if (onDuplicate === 'update' && uniqueIndex) {
      query = query
        .onConflict(uniqueIndex)
        .merge();
    } else if (onDuplicate === 'ignore' && uniqueIndex) {
      query = query
        .onConflict(uniqueIndex)
        .ignore();
    }

    // eslint-disable-next-line no-await-in-loop
    const rows = await query;
    const inserted = rows.map(r => {
      if (r.id) {
        return r;
      }
      if (onDuplicate === 'ignore') {
        return null;
      }
      throw new Error(`${this.name}.bulkInsert: failed to insert row.`);
    });
    if (!process.env.PRODUCTION) {
      for (const row of rows) {
        row.$validate();
      }
    }
    allInserted = [...allInserted, ...inserted];

    // eslint-disable-next-line no-await-in-loop
    await RequestContextLocalStorage.exit(() => {
      let hasInserted = false;
      const promises = inserted.flatMap(ent => {
        if (!ent) {
          return null;
        }
        hasInserted = true;
        if (onDuplicate === 'update') {
          return [
            modelsCache.handleUpdate(rc, this, ent),
            modelIdsCache.handleUpdate(rc, this, ent),
          ];
        }
        return [
          modelsCache.handleInsert(rc, this, ent),
          modelIdsCache.handleInsert(rc, this, ent),
        ];
      });
      if (hasInserted) {
        promises.push(updateLastWriteTime(this.type));
      }
      return Promise.all(promises);
    });
  }

  return allInserted;
}

export default insertBulk;

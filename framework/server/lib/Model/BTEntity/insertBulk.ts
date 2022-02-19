import getPartialUniqueIndex from 'lib/modelUtils/getPartialUniqueIndex';
import modelsCache from 'services/cache/modelsCache';
import modelIdsCache from 'services/cache/modelIdsCache';
import type { BTEntityClass } from './BTEntity';

const MAX_BULK_INSERTS = 100;

function insertBulk<T extends BTEntityClass>(
  this: T,
  objs: ModelPartial<T>[],
  onDuplicate?: 'error',
): Promise<InstanceType<T>[]>;

function insertBulk<T extends BTEntityClass>(
  this: T,
  objs: ModelPartial<T>[],
  onDuplicate?: 'error' | 'update' | 'ignore',
): Promise<(InstanceType<T> | null)[]>;

async function insertBulk<T extends BTEntityClass>(
  this: T,
  objs: ModelPartial<T>[],
  onDuplicate: 'error' | 'update' | 'ignore' = 'error',
): Promise<(InstanceType<T> | null)[]> {
  const firstObj = objs[0];
  if (!firstObj) {
    return [];
  }

  const uniqueIndex = getPartialUniqueIndex(this, firstObj) as ModelIndex<T>;
  if (onDuplicate !== 'error') {
    if (!uniqueIndex) {
      throw new Error(`${this.name}.insertBulk: no unique key: ${Object.keys(firstObj).join(',')}`);
    }

    const nonUniqueObj = Array.isArray(uniqueIndex)
      ? objs.find(obj => uniqueIndex.some(col => !obj[col]))
      : objs.find(obj => !obj[uniqueIndex]);
    if (nonUniqueObj) {
      throw new Error(`${this.name}.insertBulk: object doesn't have unique key: ${Object.keys(nonUniqueObj).join(',')}`);
    }
  }

  let allInserted: (InstanceType<T> | null)[] = [];
  for (let i = 0; i < objs.length; i += MAX_BULK_INSERTS) {
    const slice = objs.slice(i, i + MAX_BULK_INSERTS);

    // todo: mid/mid handle $beforeInsert
    let query = this.query()
      .insert(slice)
      .returning('*');
    if (onDuplicate === 'update' && uniqueIndex) {
      query = query
        .onConflict(Array.isArray(uniqueIndex) ? uniqueIndex : [uniqueIndex])
        .merge();
    } else if (onDuplicate === 'ignore' && uniqueIndex) {
      query = query
        .onConflict(Array.isArray(uniqueIndex) ? uniqueIndex : [uniqueIndex])
        .ignore();
    }

    // eslint-disable-next-line no-await-in-loop
    const rows = (await query) as InstanceType<T>[];
    const inserted = rows.map(r => {
      if (r.id) {
        return r;
      }
      if (onDuplicate !== 'error') {
        return null;
      }
      throw new Error(`${this.name}.bulkInsert: inserted row didn't return ID.`);
    });
    allInserted = [...allInserted, ...inserted];

    // eslint-disable-next-line no-await-in-loop
    await Promise.all(inserted.flatMap(ent => {
      if (!ent) {
        return null;
      }
      if (ent.isInitialVersion()) {
        const mvEnt = this.getMVModelClass()
          // @ts-ignore MVType is weird
          .createMVEntityFromInsertedBT(ent);
        return [
          modelsCache.handleInsert(this, ent),
          modelIdsCache.handleInsert(this, ent),
          modelsCache.handleInsert(this.getMVModelClass(), mvEnt),
          modelIdsCache.handleInsert(this.getMVModelClass(), mvEnt),
        ];
      }
      return [
        modelsCache.handleUpdate(this, ent),
        modelIdsCache.handleUpdate(this, ent),
        modelsCache.invalidate(this.getMVModelClass(), ent),
      ];
    }));
  }

  return allInserted;
}

export default insertBulk;

import getPartialUniqueIndex from 'lib/modelUtils/getPartialUniqueIndex';
import modelsCache from 'services/cache/modelsCache';
import modelIdsCache from 'services/cache/modelIdsCache';
import type { BTEntityClass } from './BTEntity';

function insert<T extends BTEntityClass>(
  this: T,
  obj: ModelPartial<T>,
  onDuplicate?: 'error',
): Promise<InstanceType<T>>;

function insert<T extends BTEntityClass>(
  this: T,
  obj: ModelPartial<T>,
  onDuplicate?: 'error' | 'update' | 'ignore',
): Promise<InstanceType<T> | null>;

async function insert<T extends BTEntityClass>(
  this: T,
  obj: ModelPartial<T>,
  onDuplicate: 'error' | 'update' | 'ignore' = 'error',
): Promise<InstanceType<T> | null> {
  const uniqueIndex = getPartialUniqueIndex(this, obj);
  if (onDuplicate !== 'error' && !uniqueIndex) {
    throw new Error(`${this.name}.insert: don't use onDuplicate without a unique index`);
  }

  let query = this.query().insert(obj)
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

  // If there's an UniqueViolationError, don't try to fetch using unique key.
  // E.g. if 2 users create accounts using the same email, it'll fetch the other user's account.
  const row = (await query) as InstanceType<T>;
  let inserted: InstanceType<T> | null;
  if (row.id) {
    inserted = row;
  } else if (onDuplicate !== 'error') {
    inserted = null;
  } else {
    throw new Error(`${this.name}.insert: inserted row doesn't have ID.`);
  }

  if (inserted) {
    if (inserted.isInitialVersion()) {
      const insertedMV = this.getMVModelClass()
        // @ts-ignore MVType is weird
        .createMVEntityFromInsertedBT(inserted);
      await Promise.all([
        modelsCache.handleInsert(this, inserted),
        modelIdsCache.handleInsert(this, inserted),
        modelsCache.handleInsert(this.getMVModelClass(), insertedMV),
        modelIdsCache.handleInsert(this.getMVModelClass(), insertedMV),
      ]);
    } else {
      await Promise.all([
        modelsCache.handleUpdate(this, inserted),
        modelIdsCache.handleUpdate(this, inserted),
        modelsCache.invalidate(this.getMVModelClass(), inserted),
      ]);
    }
  }

  return inserted;
}

export default insert;

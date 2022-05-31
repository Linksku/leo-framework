import getPartialUniqueIndex from 'utils/models/getPartialUniqueIndex';
import modelsCache from 'services/cache/modelsCache';
import modelIdsCache from 'services/cache/modelIdsCache';
import knexBT from 'services/knex/knexBT';

function insert<T extends EntityClass>(
  this: T,
  obj: EntityPartial<T>,
  onDuplicate?: 'error' | 'update',
): Promise<EntityInstance<T>>;

function insert<T extends EntityClass>(
  this: T,
  obj: EntityPartial<T>,
  onDuplicate: 'ignore',
): Promise<EntityInstance<T> | null>;

async function insert<T extends EntityClass>(
  this: T,
  obj: EntityPartial<T>,
  onDuplicate: 'error' | 'update' | 'ignore' = 'error',
): Promise<EntityInstance<T> | null> {
  const uniqueIndex = getPartialUniqueIndex(this, obj);
  if (onDuplicate !== 'error' && !uniqueIndex) {
    throw new Error(`${this.name}.insert: don't use onDuplicate without a unique index`);
  }

  let query = entityQuery(this, knexBT)
    .insert(
      obj,
    )
    .returning('*') as unknown as QueryBuilder<EntityInstance<T>>['SingleQueryBuilderType'];
  if (onDuplicate === 'update' && uniqueIndex) {
    query = query
      .onConflict(uniqueIndex)
      .merge();
  } else if (onDuplicate === 'ignore' && uniqueIndex) {
    query = query
      .onConflict(uniqueIndex)
      .ignore();
  }

  // If there's an UniqueViolationError, don't try to fetch using unique key.
  // E.g. if 2 users create accounts using the same email, it'll fetch the other user's account.
  const row = await query;
  let inserted: EntityInstance<T> | null;
  if (row.id) {
    inserted = row;
  } else if (onDuplicate === 'ignore') {
    inserted = null;
  } else {
    throw new Error(`${this.name}.insert: failed to insert row.`);
  }

  if (inserted) {
    await Promise.all(
      inserted.isInitialVersion()
        ? [
          modelsCache.handleInsert(this, inserted),
          modelIdsCache.handleInsert(this, inserted),
        ]
        : [
          modelsCache.handleUpdate(this, inserted),
          modelIdsCache.handleUpdate(this, inserted),
        ]);
  }

  return inserted;
}

export default insert;

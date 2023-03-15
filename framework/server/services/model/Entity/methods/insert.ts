import type { Knex } from 'knex';

import getPartialUniqueIndex from 'utils/models/getPartialUniqueIndex';
import modelsCache from 'services/cache/modelsCache';
import modelIdsCache from 'services/cache/modelIdsCache';
import knexBT from 'services/knex/knexBT';
import { updateLastWriteTime } from 'services/model/helpers/lastWriteTimeHelpers';
import RequestContextLocalStorage from 'services/requestContext/RequestContextLocalStorage';

function insert<T extends EntityClass, Obj extends ModelPartialExact<T, Obj>>(
  this: T,
  obj: Obj,
  opts?: {
    onDuplicate?: 'update' | 'ignore',
    trx?: Knex.Transaction,
  },
): Promise<EntityInstance<T>>;

function insert<T extends EntityClass, Obj extends ModelPartialExact<T, Obj>>(
  this: T,
  obj: Obj,
  opts: {
    onDuplicate: 'ignore',
    trx?: Knex.Transaction,
  },
): Promise<EntityInstance<T> | null>;

async function insert<T extends EntityClass, Obj extends ModelPartialExact<T, Obj>>(
  this: T,
  obj: Obj,
  {
    onDuplicate = 'error' as 'error' | 'update' | 'ignore',
    trx,
  }: {
    onDuplicate?: 'error' | 'update' | 'ignore',
    trx?: Knex.Transaction
  } = {},
): Promise<EntityInstance<T> | null> {
  const uniqueIndex = getPartialUniqueIndex(this, obj);
  if (onDuplicate !== 'error' && !uniqueIndex) {
    throw new Error(`${this.name}.insert: don't use onDuplicate without a unique index`);
  }

  let query = entityQuery(this, trx ?? knexBT)
    .insert(
      obj,
    )
    .returning([
      '*',
      ...(onDuplicate === 'update' ? [raw('(xmax = 0) as "__didInsert"')] : []),
    ]) as unknown as QueryBuilder<EntityInstance<T>>['SingleQueryBuilderType'];
  if (onDuplicate === 'update') {
    query = query
      .onConflict(TS.notNull(uniqueIndex))
      .merge();
  } else if (onDuplicate === 'ignore') {
    query = query
      .onConflict(TS.notNull(uniqueIndex))
      .ignore();
  }

  // If there's an UniqueViolationError, don't try to fetch using unique key.
  // E.g. if 2 users create accounts using the same email, it'll fetch the other user's account.
  const row = await query;
  // @ts-ignore wontfix custom col
  const didInsert = row.__didInsert;
  // @ts-ignore wontfix custom col
  delete row.__didInsert;
  if (!process.env.PRODUCTION) {
    row.$validate();
  }

  let inserted: EntityInstance<T> | null;
  if (row.id) {
    inserted = row;
  } else if (onDuplicate === 'ignore') {
    inserted = null;
  } else {
    throw new Error(`${this.name}.insert: failed to insert row.`);
  }

  if (inserted) {
    const insertedDefined = inserted;
    const rc = getRC();
    await RequestContextLocalStorage.exit(
      () => Promise.all(
        onDuplicate === 'update' && !didInsert
          ? [
            modelsCache.handleUpdate(rc, this, insertedDefined),
            modelIdsCache.handleUpdate(rc, this, insertedDefined),
            updateLastWriteTime(this.type),
          ]
          : [
            modelsCache.handleInsert(rc, this, insertedDefined),
            modelIdsCache.handleInsert(rc, this, insertedDefined),
            updateLastWriteTime(this.type),
          ],
      ),
    );
  }

  return inserted;
}

export default insert;

import getPartialUniqueIndex from 'utils/models/getPartialUniqueIndex';
import modelsCache from 'services/cache/modelsCache';
import modelIdsCache from 'services/cache/modelIdsCache';
import knexBT from 'services/knex/knexBT';
import { updateLastWriteTime } from 'services/model/helpers/lastWriteTimeHelpers';
import waitForRRUpdate from 'utils/models/waitForRRUpdate';

const MAX_BULK_INSERTS = 100;

function insertBulk<T extends EntityClass>(
  this: T,
  objs: ModelPartial<T>[],
  opts?: {
    onDuplicate?: 'update' | 'ignore',
    waitForRR?: boolean,
  },
): Promise<EntityInstance<T>[]>;

function insertBulk<T extends EntityClass>(
  this: T,
  objs: ModelPartial<T>[],
  opts: {
    onDuplicate: 'ignore',
    waitForRR?: boolean,
  },
): Promise<(EntityInstance<T> | null)[]>;

async function insertBulk<T extends EntityClass>(
  this: T,
  objs: ModelPartial<T>[],
  { onDuplicate = 'error', waitForRR }: {
    onDuplicate?: 'error' | 'update' | 'ignore',
    waitForRR?: boolean,
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
      throw new Error(`${this.name}.insertBulk: object doesn't have unique key: ${Object.keys(nonUniqueObj).join(',')}`);
    }
  }

  let allInserted: (EntityInstance<T> | null)[] = [];
  for (let i = 0; i < objs.length; i += MAX_BULK_INSERTS) {
    const slice = objs.slice(i, i + MAX_BULK_INSERTS);

    // todo: mid/mid handle $beforeInsert
    let query = entityQuery(this, knexBT)
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
    const rows = (await query) as EntityInstance<T>[];
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
    await Promise.all(inserted.flatMap(ent => {
      if (!ent) {
        return null;
      }
      if (ent.isInitialVersion()) {
        return [
          modelsCache.handleInsert(this, ent),
          modelIdsCache.handleInsert(this, ent),
        ];
      }
      return [
        modelsCache.handleUpdate(this, ent),
        modelIdsCache.handleUpdate(this, ent),
      ];
    }));
  }

  const allInsertedNonNull = TS.filterNulls(allInserted);
  if (allInsertedNonNull.length) {
    await updateLastWriteTime(this.type);
    if (waitForRR) {
      const last = allInsertedNonNull[allInsertedNonNull.length - 1];
      await waitForRRUpdate(this, last.id, last.version);
    }
  }

  return allInserted;
}

export default insertBulk;

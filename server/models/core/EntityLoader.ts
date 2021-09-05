import DataLoader from 'dataloader';
import PLazy from 'p-lazy';
import { UniqueViolationError } from 'db-errors';

import EntitiesCache from 'services/EntitiesCache';

import EntityDates from './EntityDates';

const dataLoaders: ObjectOf<DataLoader<any, Entity | null>> = Object.create(null);

function getDataLoader<T extends EntityModel>(
  Model: T,
): DataLoader<any, InstanceType<T> | null> {
  if (process.env.NODE_ENV !== 'production' && !Model.type) {
    throw new Error(`getDataLoader: ${Model.constructor.name} doesn't have type.`);
  }

  if (!dataLoaders[Model.type]) {
    dataLoaders[Model.type] = new DataLoader(
      async (kvPairs: readonly [
        InstanceKey<T>,
        InstanceType<T>[InstanceKey<T>] & (string | number),
      ][]) => {
        let query = Model.query();
        for (const pair of kvPairs) {
          query = query.orWhere(pair[0], pair[1]);
        }
        const results = (await query) as InstanceType<T>[];
        return kvPairs.map(
          pair => results.find(r => r[pair[0]] === pair[1]) || null,
        );
      },
      {
        maxBatchSize: 100,
        cache: false,
      },
    );
  }
  return dataLoaders[Model.type] as DataLoader<any, InstanceType<T> | null>;
}

function validateUniqueKV<T extends EntityModel>(
  Model: T,
  key: InstanceKey<T>,
  val: string | number,
): void {
  if (!Model.getUniqueProperties().has(key)) {
    throw new Error(`validateUniqueKV: non-unique property: ${key}`);
  }

  const type = Model.dbJsonSchema.properties[key]?.type;
  if ((type === 'string' && typeof val !== 'string')
    || ((type === 'number' || type === 'integer') && typeof val !== 'number')) {
    throw new Error(`validateUniqueKV: val (${val}: ${typeof val}) doesn't match schema (${type}).`);
  }
}

// todo: high/veryhard add object cache layer like tao/entql
// todo: mid/veryhard EntityLoader doesn't work with transactions
export default class EntityLoader extends EntityDates {
  static async findOne<T extends EntityModel>(
    this: T,
    key: InstanceKey<T>,
    val: Nullish<string | number>,
  ): Promise<InstanceType<T> | null> {
    if (!val) {
      return null;
    }

    validateUniqueKV(this, key, val);

    const cached = EntitiesCache.getCacheForKV(this, key, val);
    if (cached) {
      return cached;
    }

    let getEntity = getDataLoader(this).load([key, val]);
    getEntity = getEntity.then(entity => {
      if (entity) {
        EntitiesCache.setCacheForEntity(this, entity, getEntity);
      }
      return entity;
    });
    EntitiesCache.setCacheForKV(this, key, val, getEntity);
    return getEntity;
  }

  static async insert<T extends EntityModel>(
    this: T,
    obj: Partial<InstanceType<T>>,
  ): Promise<number> {
    let hasUniqueKey = false;
    const uniqueProperties = this.getUniqueProperties();
    for (const key of uniqueProperties) {
      if (key !== 'id') {
        if (typeof key === 'string' && TS.hasProperty(obj, key)) {
          hasUniqueKey = true;
        } else if (Array.isArray(key) && key.every(k => TS.hasProperty(obj, k))) {
          hasUniqueKey = true;
        } else {
          throw new Error(`${this.constructor.name}.insert: missing unique property: ${key}`);
        }
      }
    }

    if (hasUniqueKey) {
      const cached = EntitiesCache.getCacheForEntity(this, obj);
      if (cached) {
        const entity = await cached;
        const firstUniqueKey = [...uniqueProperties].find(p => p !== 'id');
        if (entity && firstUniqueKey) {
          const duplicateColumns = Array.isArray(firstUniqueKey)
            ? firstUniqueKey.map(k => `${k}=${entity[k]}`).join(', ')
            : `${firstUniqueKey}=${entity[firstUniqueKey]}`;
          // @ts-ignore typings are wrong.
          throw new UniqueViolationError({
            nativeError: new Error(`Already have entity ${this.type} with ${duplicateColumns}`),
            constraint: firstUniqueKey,
            client: 'mysql',
          });
        }
      }
    }

    const insertEntity = (async () => {
      const res = await this.query().insert(obj);
      return res.id;
    })();
    const fetchEntityAfterInsert = new PLazy(succ => succ(
      insertEntity
        .then(
          async id => getDataLoader(this).load(['id', id]),
          err => {
          // Don't try to fetch using unique key. E.g. if 2 users create accounts using
          // the same email, it'll fetch the other user's account.
            if (err instanceof UniqueViolationError) {
              EntitiesCache.clearCacheForEntity(this, obj);
            }
            console.error(err);
            throw new Error('Attempted to fetch data while it\'s inserting and failed to insert.');
          },
        ),
    )) as Promise<InstanceType<T> | null>;

    EntitiesCache.setCacheForEntity(this, obj, fetchEntityAfterInsert);
    return insertEntity
      .then(
        id => {
          EntitiesCache.setCacheForKV(this, 'id', id, fetchEntityAfterInsert);
          EntitiesCache.invalidateCache(this, {
            id,
            ...obj,
          });
          return id;
        },
        err => {
          EntitiesCache.clearCacheForEntity(this, obj);
          throw err;
        },
      );
  }

  static async insertIgnore<T extends EntityModel>(
    this: T,
    obj: Partial<InstanceType<T>>,
  ): Promise<number | null> {
    try {
      const insertedId = await this.insert(obj);
      return insertedId;
    } catch (err) {
      if (err instanceof UniqueViolationError) {
        return null;
      }
      throw err;
    }
  }

  static async patch<T extends EntityModel>(
    this: T,
    key: InstanceKey<T>,
    val: string | number,
    obj: Partial<InstanceType<T>>,
  ): Promise<void> {
    validateUniqueKV(this, key, val);

    const cached = EntitiesCache.getCacheForKV(this, key, val);
    if (cached) {
      const entity = await cached;
      if (!entity) {
        throw new Error(`Can't patch entity ${this.type} with ${key}=${val}, doesn't exist.`);
      }
    }

    const patchEntity = (async () => {
      const affectedRows = await this.query()
        .patch(obj)
        .where(key, val);
      return affectedRows;
    })();

    const fetchAfterPatch = (async () => {
      try {
        await patchEntity;
      } catch (err) {
        console.error(err);
        throw new Error('Attempted to fetch data while it\'s patching and failed to patch.');
      }

      const entity = await getDataLoader(this).load([key, val]);
      if (entity) {
        EntitiesCache.setCacheForEntity(this, entity, Promise.resolve(entity));
        EntitiesCache.invalidateCache(this, entity);
      } else {
        EntitiesCache.invalidateCache(this, { [key]: val } as unknown as Partial<InstanceType<T>>);
      }
      return entity;
    })();

    EntitiesCache.setCacheForKV(this, key, val, fetchAfterPatch);
    try {
      const affectedRows = await patchEntity;

      if (!affectedRows) {
        throw new Error('Row to patch not found.');
      }
      if (affectedRows > 1) {
        // Shouldn't be possible.
        if (process.env.NODE_ENV === 'production') {
          console.error('More than 1 row patched.');
        } else {
          throw new Error('More than 1 row patched.');
        }
      }

      // Wait for fetch to ensure consistency when calling
      // findOne right after patch.
      await fetchAfterPatch;
    } catch (err) {
      EntitiesCache.clearCacheForKV(this, key, val);
      throw err;
    }
  }

  static async delete<T extends EntityModel>(
    this: T,
    key: InstanceKey<T>,
    val: string | number,
  ): Promise<void> {
    validateUniqueKV(this, key, val);

    const cached = EntitiesCache.getCacheForKV(this, key, val);
    if (cached) {
      await cached;
    }

    let entity;
    const getEntity = (async () => {
      let promise = EntitiesCache.getCacheForKV(this, key, val);
      if (!promise) {
        promise = getDataLoader(this).load([key, val]);
      }
      entity = await promise;
    })();

    const deleteEntity = (async () => {
      await getEntity;

      const affectedRows = await this.query()
        .delete()
        .where(key, val);
      return affectedRows;
    })();

    const fetchAfterDelete = (async () => {
      try {
        await deleteEntity;
      } catch (err) {
        console.error(err);
        throw new Error('Attempted to fetch data while it\'s deleting and failed to delete.');
      }
      return null;
    })();

    EntitiesCache.setCacheForKV(this, key, val, fetchAfterDelete);
    try {
      await getEntity;
      if (entity) {
        EntitiesCache.setCacheForEntity(this, entity, fetchAfterDelete);
      }

      const affectedRows = await deleteEntity;
      if (affectedRows > 1) {
        // Shouldn\'t be possible.
        if (process.env.NODE_ENV === 'production') {
          console.error('More than 1 row deleted.');
        } else {
          throw new Error('More than 1 row deleted.');
        }
      }

      if (entity) {
        EntitiesCache.invalidateCache(this, entity);
      } else {
        EntitiesCache.invalidateCache(this, { [key]: val } as unknown as Partial<InstanceType<T>>);
      }
    } catch (err) {
      EntitiesCache.clearCacheForKV(this, key, val);
      if (entity) {
        EntitiesCache.clearCacheForEntity(this, entity);
      }
      throw err;
    }
  }

  static async deleteAll<T extends EntityModel>(
    this: T,
    obj: Partial<InstanceType<T>>,
  ): Promise<void> {
    let entities: InstanceType<T>[] | undefined;
    const getEntities = (async () => {
      entities = await this.query().where(obj) as InstanceType<T>[];
    })();

    const deleteEntities = (async () => {
      await getEntities;
      await this.query().where(obj).delete();
    })();

    const fetchAfterDelete = (async () => {
      try {
        await deleteEntities;
      } catch (err) {
        console.error(err);
        throw new Error('Attempted to fetch data while it\'s deleting and failed to delete.');
      }
      return null;
    })();

    try {
      await getEntities;
      if (entities) {
        for (const entity of entities) {
          EntitiesCache.setCacheForEntity(this, entity, fetchAfterDelete);
        }
      }

      await deleteEntities;

      if (entities) {
        for (const entity of entities) {
          EntitiesCache.invalidateCache(this, entity);
        }
      }
    } catch (err) {
      if (entities) {
        for (const entity of entities) {
          EntitiesCache.clearCacheForEntity(this, entity);
        }
      }
      throw err;
    }
  }
}

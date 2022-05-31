import BaseRedisCache from 'services/cache/BaseRedisCache';
import getIndexesFirstColumn from 'utils/models/getIndexesFirstColumn';
import getModelIndexDataLoader from 'services/dataLoader/getModelIndexDataLoader';
import getModelCacheKey from './utils/getModelCacheKey';

const redisCache = new BaseRedisCache<EntityId[]>({
  redisNamespace: 'modelIds',
  serialize: ids => JSON.stringify(ids),
  unserialize: json => {
    if (!json) {
      return undefined;
    }
    try {
      const parsed = JSON.parse(json);
      return parsed;
    } catch {}
    return undefined;
  },
  lruMaxSize: 10_000,
});

async function invalidateCache<T extends ModelClass>(
  Model: T,
  partial: ModelPartial<T>,
): Promise<void> {
  if (!Model.cacheable) {
    return;
  }

  const indexes = getIndexesFirstColumn(Model);
  const cacheKeys = [...indexes]
    .filter(col => partial[col] !== undefined)
    .map(col => getModelCacheKey(Model, [col], partial));
  await Promise.all(cacheKeys.map(k => redisCache.del(k)));
}

export default {
  async get<T extends ModelClass>(
    Model: T,
    column: ModelKey<T>,
    partial: ModelPartial<T>,
  ): Promise<EntityId[]> {
    const getIds = async () => {
      const rows = await getModelIndexDataLoader(Model, [column]).load(partial);
      const ids = rows.map(row => row[0] as number);
      const nonNumberId = ids.find(id => typeof id !== 'number');
      if (nonNumberId !== undefined) {
        throw new Error(`modelIdsCache(${Model.type}, ${column}): returned non-numbers "${nonNumberId}" (${typeof nonNumberId})`);
      }
      // Arbitrary number.
      if (!process.env.PRODUCTION && ids.length > 10_000) {
        throw new Error(`modelIdsCache(${Model.type}, ${column}): too many rows.`);
      }
      return ids;
    };

    if (!Model.cacheable) {
      return getIds();
    }

    // todo: low/easy validate column value is a number
    const partialKeys = TS.objKeys(partial).sort();
    const cacheKey = `${Model.type}.${partialKeys.map(k => `${k}=${partial[k]}`).join(',')}`;
    const fromRedis = await redisCache.get(cacheKey);
    if (fromRedis !== undefined) {
      return fromRedis;
    }

    const ids = await getIds();

    void wrapPromise(
      redisCache.set(cacheKey, ids),
      'warn',
      `Set ${Model.type}.${column} ids after getting`,
    );
    return ids;
  },

  handleUpdate<T extends ModelClass>(
    _Model: T,
    _partial: ModelInstance<T>,
  ): void {
    // Nothing happens.
  },

  handleInsert<T extends ModelClass>(
    Model: T,
    ent: ModelInstance<T>,
  ): Promise<void> {
    // todo: mid/hard use redis lists instead of invalidating every time
    return invalidateCache(Model, ent);
  },

  handleDelete<T extends ModelClass>(
    Model: T,
    partial: ModelPartial<T>,
  ): Promise<void> {
    return invalidateCache(Model, partial);
  },

  invalidate<T extends ModelClass>(
    Model: T,
    partial: ModelPartial<T>,
  ): Promise<void> {
    return invalidateCache(Model, partial);
  },
};

import getPartialUniqueIndex from 'utils/models/getPartialUniqueIndex';
import getPartialAllUniqueIndexes from 'utils/models/getPartialAllUniqueIndexes';
import getModelDataLoader from 'services/dataLoader/getModelDataLoader';
import BaseRedisCache from './BaseRedisCache';
import { getModelCacheKey } from './utils/getModelCacheKey';

const redisCache = new BaseRedisCache<Model | null>({
  redisNamespace: 'model',
  serialize: instance => (instance
    ? JSON.stringify(instance.$toCacheJson())
    : 'null'),
  unserialize: (json, key) => {
    if (!json) {
      return undefined;
    }
    if (json === 'null') {
      return null;
    }
    const modelType = key.split('.', 1)[0] as ModelType | undefined;
    if (!modelType) {
      return undefined;
    }

    const Model = getModelClass<ModelType>(modelType);
    try {
      const parsed = JSON.parse(json);
      return Model.fromCacheJson(parsed);
    } catch {
      ErrorLogger.error(new Error(`modelsCache(${key}): data isn't JSON`), json.slice(0, 100));
    }
    return undefined;
  },
  lruMaxSize: 10_000,
});

async function set<T extends ModelClass>(
  Model: T,
  ent: ModelInstance<T>,
): Promise<void> {
  const allCacheKeys = Model.getUniqueIndexes()
    .map(index => getModelCacheKey(Model, index, ent));
  try {
    await Promise.all(allCacheKeys.map(key => redisCache.set(key, ent, !Model.cacheable)));
  } catch (err) {
    ErrorLogger.warn(ErrorLogger.castError(err), `modelsCache.set(${Model.type})`);
  }
}

async function setNull<T extends ModelClass>(
  Model: T,
  partial: ModelPartial<T>,
): Promise<void> {
  const allCacheKeys = getPartialAllUniqueIndexes(Model, partial)
    .map(index => getModelCacheKey(Model, index, partial));
  try {
    await Promise.all(allCacheKeys.map(key => redisCache.set(key, null, !Model.cacheable)));
  } catch (err) {
    ErrorLogger.warn(ErrorLogger.castError(err), `modelsCache.setNull(${Model.type})`);
  }
}

export default {
  async get<T extends ModelClass>(
    Model: T,
    partial: ModelPartial<T>,
  ): Promise<ModelInstance<T> | null> {
    const uniqueIndex = getPartialUniqueIndex(Model, partial);
    if (!uniqueIndex) {
      return null;
    }

    const cacheKey = getModelCacheKey(Model, uniqueIndex, partial);
    const fromRedis = (await redisCache.get(
      cacheKey,
      !Model.cacheable,
    )) as Nullish<ModelInstance<T>>;
    if (fromRedis !== undefined) {
      return fromRedis;
    }

    const instance = await getModelDataLoader(Model).load(partial);
    if (instance) {
      wrapPromise(
        set(Model, instance),
        'warn',
        `modelsCache.get(${Model.type}) with instance`,
      );
    } else {
      wrapPromise(
        setNull(Model, partial),
        'warn',
        `modelsCache.get(${Model.type}) without instance`,
      );
    }

    return instance;
  },

  handleUpdate<T extends ModelClass>(
    Model: T,
    ent: ModelInstance<T>,
  ): Promise<void> {
    return set(Model, ent);
  },

  handleInsert<T extends ModelClass>(
    Model: T,
    ent: ModelInstance<T>,
  ): Promise<void> {
    return set(Model, ent);
  },

  // If an model is deleted, use set(null).
  handleDelete<T extends ModelClass>(
    Model: T,
    partial: ModelPartial<T>,
  ): Promise<void> {
    return setNull(Model, partial);
  },

  async invalidate<T extends ModelClass>(
    Model: T,
    partial: ModelPartial<T>,
  ): Promise<void> {
    if (!Model.cacheable) {
      return;
    }

    const allCacheKeys = getPartialAllUniqueIndexes(Model, partial)
      .map(index => getModelCacheKey(Model, index, partial));
    try {
      await Promise.all(allCacheKeys.map(key => redisCache.del(key)));
    } catch (err) {
      ErrorLogger.warn(ErrorLogger.castError(err), `modelsCache.invalidate(${Model.type})`);
    }
  },
};

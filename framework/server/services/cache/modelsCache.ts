import getPartialUniqueIndex from 'lib/modelUtils/getPartialUniqueIndex';
import getPartialUniqueIndexes from 'lib/modelUtils/getPartialUniqueIndexes';
import getModelDataLoader from 'services/dataLoader/getModelDataLoader';
import BaseRedisCache from './BaseRedisCache';
import getModelCacheKey from './utils/getModelCacheKey';

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
    } catch {}
    return undefined;
  },
  lruMaxSize: 10_000,
});

async function set<T extends ModelClass>(
  Model: T,
  ent: InstanceType<T>,
): Promise<void> {
  if (!Model.cacheable) {
    return;
  }

  const allCacheKeys = Model.getUniqueIndexes()
    .map(index => getModelCacheKey(Model, index, ent));
  await wrapPromise(
    Promise.all(allCacheKeys.map(key => redisCache.set(key, ent))),
    'warn',
    `Failed to set ${Model.type} Redis cache`,
  );
}

async function setNull<T extends ModelClass>(
  Model: T,
  partial: ModelPartial<T>,
): Promise<void> {
  if (!Model.cacheable) {
    return;
  }

  const allCacheKeys = getPartialUniqueIndexes(Model, partial)
    .map(index => getModelCacheKey(Model, index, partial));
  await wrapPromise(
    Promise.all(allCacheKeys.map(key => redisCache.set(key, null))),
    'warn',
    `Failed to set ${Model.type} Redis cache`,
  );
}

export default {
  // todo: mid/mid fetch from db if it's expiring soon
  async get<T extends ModelClass>(
    Model: T,
    partial: ModelPartial<T>,
  ): Promise<InstanceType<T> | null> {
    if (!Model.cacheable) {
      return getModelDataLoader(Model).load(partial);
    }

    const uniqueIndex = getPartialUniqueIndex(Model, partial);
    if (!uniqueIndex) {
      return null;
    }

    const cacheKey = getModelCacheKey(Model, uniqueIndex, partial);
    const fromRedis = (await redisCache.get(cacheKey)) as Nullish<InstanceType<T>>;
    if (fromRedis !== undefined) {
      return fromRedis;
    }

    const instance = await getModelDataLoader(Model).load(partial);
    if (instance) {
      void set(Model, instance);
    } else {
      void setNull(Model, partial);
    }

    return instance;
  },

  handleUpdate<T extends ModelClass>(
    Model: T,
    ent: InstanceType<T>,
  ): Promise<void> {
    return set(Model, ent);
  },

  handleInsert<T extends ModelClass>(
    Model: T,
    ent: InstanceType<T>,
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

    const allCacheKeys = getPartialUniqueIndexes(Model, partial)
      .map(index => getModelCacheKey(Model, index, partial));
    await wrapPromise(
      Promise.all(allCacheKeys.map(key => redisCache.del(key))),
      'warn',
      `Failed to invalidate ${Model.type} Redis cache`,
    );
  },
};

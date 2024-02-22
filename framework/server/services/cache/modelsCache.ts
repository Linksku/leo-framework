import getPartialUniqueIndex from 'utils/models/getPartialUniqueIndex';
import getPartialAllUniqueIndexes from 'utils/models/getPartialAllUniqueIndexes';
import getModelDataLoader from 'services/dataLoader/getModelDataLoader';
import { MODEL_INSTANCE } from 'consts/coreRedisNamespaces';
import BaseRedisCache from './BaseRedisCache';
import { getModelCacheKey } from './utils/getModelCacheKey';

const redisCache = new BaseRedisCache<Model | null>({
  redisNamespace: MODEL_INSTANCE,
  serialize: instance => (instance
    // todo: low/mid use schema in stringify, e.g. fast-json-stringify
    ? JSON.stringify(instance.$toCachePojo())
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

    const Model = getModelClass(modelType);
    try {
      const parsed = JSON.parse(json);
      return Model.fromCachePojo(parsed);
    } catch {
      ErrorLogger.error(
        new Error(`modelsCache(${key}): data isn't JSON`),
        { json },
      );
    }
    return undefined;
  },
  lruMaxSize: 10_000,
});

async function set<T extends ModelClass>(
  rc: Nullish<RequestContext>,
  Model: T,
  ent: ModelInstance<T>,
): Promise<void> {
  const allCacheKeys = Model.getUniqueIndexes()
    .map(index => getModelCacheKey(Model, index, ent));
  try {
    await Promise.all(allCacheKeys.map(
      key => redisCache.setWithRc(rc, key, ent, !Model.cacheable),
    ));
  } catch (err) {
    ErrorLogger.warn(err, { ctx: `modelsCache.set(${Model.type})` });
  }
}

async function setNull<T extends ModelClass>(
  rc: Nullish<RequestContext>,
  Model: T,
  partial: ModelPartial<T>,
): Promise<void> {
  const allCacheKeys = getPartialAllUniqueIndexes(Model, partial)
    .map(index => getModelCacheKey(Model, index, partial));
  try {
    await Promise.all(allCacheKeys.map(
      key => redisCache.setWithRc(rc, key, null, !Model.cacheable),
    ));
  } catch (err) {
    ErrorLogger.warn(err, { ctx: `modelsCache.setNull(${Model.type})` });
  }
}

export default {
  async get<T extends ModelClass>(
    rc: Nullish<RequestContext>,
    Model: T,
    partial: ModelPartial<T>,
  ): Promise<Readonly<ModelInstance<T>> | null> {
    const uniqueIndex = getPartialUniqueIndex(Model, partial);
    if (!uniqueIndex) {
      return null;
    }

    const cacheKey = getModelCacheKey(Model, uniqueIndex, partial);
    const fromRedis = await redisCache.getWithRc(
      rc,
      cacheKey,
      !Model.cacheable,
    );
    if (fromRedis !== undefined) {
      return fromRedis;
    }

    // todo: low/mid errors may be cached and reused, causing long debugCtx
    const instance = await getModelDataLoader(Model).load(partial);
    if (instance) {
      wrapPromise(
        set(rc, Model, instance),
        'warn',
        `modelsCache.get(${Model.type}) with instance`,
      );
    } else {
      wrapPromise(
        setNull(rc, Model, partial),
        'warn',
        `modelsCache.get(${Model.type}) without instance`,
      );
    }

    return instance;
  },

  handleUpdate<T extends ModelClass>(
    rc: Nullish<RequestContext>,
    Model: T,
    ent: ModelInstance<T>,
  ): Promise<void> {
    return set(rc, Model, ent);
  },

  handleInsert<T extends ModelClass>(
    rc: Nullish<RequestContext>,
    Model: T,
    ent: ModelInstance<T>,
  ): Promise<void> {
    return set(rc, Model, ent);
  },

  handleDelete<T extends ModelClass>(
    rc: Nullish<RequestContext>,
    Model: T,
    partial: ModelPartial<T>,
  ): Promise<void> {
    return setNull(rc, Model, partial);
  },

  async invalidate<T extends ModelClass>(
    rc: Nullish<RequestContext>,
    Model: T,
    partial: ModelPartial<T>,
  ): Promise<void> {
    if (!Model.cacheable) {
      return;
    }

    const allCacheKeys = getPartialAllUniqueIndexes(Model, partial)
      .map(index => getModelCacheKey(Model, index, partial));
    try {
      await Promise.all(allCacheKeys.map(key => redisCache.delWithRc(rc, key)));
    } catch (err) {
      ErrorLogger.warn(err, { ctx: `modelsCache.invalidate(${Model.type})` });
    }
  },
};
